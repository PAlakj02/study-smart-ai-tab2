import OpenAI from 'openai';

const API_KEY = import.meta.env.VITE_GROK_API_KEY;

if (!API_KEY) {
  console.warn('Grok API key is not set. AI features will be limited.');
}

const grokClient = API_KEY
  ? new OpenAI({
      apiKey: API_KEY,
      baseURL: 'https://api.x.ai/v1',
      dangerouslyAllowBrowser: true,
    })
  : null;

export interface NeurodivergentOptions {
  shorterSessions: boolean;
  extraBreaks: boolean;
  visualChecklist: boolean;
  flexibleCatchUp: boolean;
  lowDistractionMode: boolean;
}

export interface TopicDetail {
  name: string;
  description?: string;
  topicId?: string;
}

export interface RoadmapInput {
  subjects: string[];
  subjectId: string;
  topicTags?: string[];
  // Optional richer info for the same names in topicTags — used to give the AI
  // prompt real descriptions and to carry stable topic IDs through to each
  // WeekPlan, instead of baking descriptions into the topic name string itself.
  topicDetails?: TopicDetail[];
  startDate?: string;         // "YYYY-MM-DD" — defaults to today when omitted
  // "YYYY-MM-DD" — when the study SCHEDULE finishes. The AI/scheduler only
  // ever generates weeklyPlans/sessions inside [startDate, endDate]. Fully
  // independent of examDate — do not derive one from the other.
  endDate: string;
  // "YYYY-MM-DD" — the actual exam. Purely a display/target date; it has no
  // influence on how many weeks are generated or when sessions are scheduled.
  // May legitimately fall after endDate (a study window that finishes before
  // the exam, leaving a gap for rest/independent revision).
  examDate: string;
  currentLevel: string;
  studyHoursPerDay: number;
  weakAreas?: string[];
  goals?: string;
  preferredStudyStyle?: string;
  // Scheduling parameters
  availableStudyDays: number[];       // 0 = Sunday … 6 = Saturday
  preferredStartTime: string;         // "HH:MM"
  preferredEndTime: string;           // "HH:MM"
  sessionLengthMinutes: number;
  breakLengthMinutes: number;
  examUrgency: 'low' | 'medium' | 'high';
  focusPreference: 'short' | 'long' | 'mixed';
  includeBufferDays: boolean;
  neurodivergentSupport: boolean;
  neurodivergentOptions?: NeurodivergentOptions;
}

export interface TimetableBlock {
  date: string;       // "YYYY-MM-DD"
  day: string;        // "Monday"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  duration: number;   // minutes
  subject: string;
  subjectId: string;
  topic: string;
  status: 'scheduled' | 'completed' | 'skipped';
}

export interface WeekPlan {
  week: number;
  focus: string;
  topics: string[];
  // Same index-correspondence as `topics` — the stable syllabus topic id for
  // each entry, when it could be resolved. Consumers should match on this
  // first and only fall back to matching `topics[i]` by name when undefined.
  topicIds?: (string | undefined)[];
  goals: string[];
  notes?: string; // user-editable personal notes for the week
  studyHours: number;
}

export interface StudyRoadmap {
  id: string;
  subjectId: string;
  subjectName: string;
  topicTags?: string[];
  // Three fully independent, user-selected dates — none is ever derived from
  // either of the others:
  startDate: string;   // "YYYY-MM-DD" — when the study schedule begins
  endDate: string;     // "YYYY-MM-DD" — when the study schedule finishes; weeklyPlans/sessions never extend past this
  examDate: string;    // "YYYY-MM-DD" — the actual exam; may fall after endDate
  title: string;
  description: string;
  totalWeeks: number;
  weeklyPlans: WeekPlan[];
  tips: string[];
  createdAt: string;
  suggestedSessions?: TimetableBlock[];
  // Scheduling fields — present when saved from RoadmapInput
  availableStudyDays?: number[];
  preferredStartTime?: string;
  preferredEndTime?: string;
  sessionLengthMinutes?: number;
  breakLengthMinutes?: number;
  neurodivergentOptions?: Record<string, boolean>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Assigns the user's own topics to exactly `weeks` week-buckets — the roadmap
 * always spans the full selected date range, never shrinks to fit the topic
 * count. If there are at least as many topics as weeks, splits them into
 * balanced contiguous chunks (e.g. 7 topics / 4 weeks -> [2,2,2,1]). If there
 * are fewer topics than weeks, each topic gets its own week first, then the
 * remaining weeks cycle back through the same topics again as spaced review —
 * the same real topic recurring, never an invented one. This is the single
 * source of truth for which topics appear in which week — the AI never
 * chooses topics itself. Returns `true` in `isReview` for cycled-back weeks.
 *
 * Operates on `TopicDetail` objects (not plain name strings) so that a stable
 * topicId — when the caller has one — travels through bucketing/cycling by
 * position, never by re-matching name strings afterward. Re-matching by name
 * would silently collapse two topics that happen to share the same name onto
 * whichever one is found first.
 */
const scheduleTopicsAcrossWeeks = (
  topics: TopicDetail[],
  weeks: number,
): { topics: TopicDetail[]; isReview: boolean }[] => {
  const w = Math.max(1, weeks);
  if (topics.length === 0) return Array.from({ length: w }, () => ({ topics: [], isReview: false }));

  if (topics.length >= w) {
    const base = Math.floor(topics.length / w);
    let extra = topics.length % w;
    const buckets: { topics: TopicDetail[]; isReview: boolean }[] = [];
    let idx = 0;
    for (let i = 0; i < w; i++) {
      const size = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra--;
      buckets.push({ topics: topics.slice(idx, idx + size), isReview: false });
      idx += size;
    }
    return buckets;
  }

  // Fewer topics than weeks: first pass covers each topic once, remaining
  // weeks cycle back through the list for spaced review.
  return Array.from({ length: w }, (_, i) => ({
    topics: [topics[i % topics.length]],
    isReview: i >= topics.length,
  }));
};

/** Pairs each topicTags[i] with its matching topicDetails[i] by position — the
 *  two arrays are always built together, in the same order, by the caller
 *  (RoadmapGenerator.tsx), so this never needs to re-match by name. */
const buildTopicRefs = (input: RoadmapInput): TopicDetail[] =>
  (input.topicTags ?? []).map((name, i) => ({
    name,
    topicId: input.topicDetails?.[i]?.topicId,
    description: input.topicDetails?.[i]?.description,
  }));

const buildTips = (input: RoadmapInput): string[] => {
  const nd = input.neurodivergentSupport ? input.neurodivergentOptions : null;
  return [
    nd?.shorterSessions
      ? 'Break every session into 25–30 min focused chunks with a clear start/stop signal'
      : `Use ${input.sessionLengthMinutes}-min focused sessions with ${input.breakLengthMinutes}-min breaks`,
    'Start with your hardest subject when your mind is freshest',
    nd?.visualChecklist
      ? 'Use a visual checklist — tick each topic as you complete it to build momentum'
      : 'Make concise notes and mind-maps for quick recall',
    nd?.flexibleCatchUp
      ? 'If you miss a session, use the buffer slot at the end of the week — never skip ahead'
      : 'Review previous topics regularly to strengthen retention',
    'Sleep 7–8 hours — memory consolidates during sleep',
    nd?.lowDistractionMode
      ? 'Phone in another room, site blockers on, one tab open at a time'
      : 'Put your phone face-down and away from your desk during sessions',
    `Study on your planned days (${(input.availableStudyDays ?? [1, 2, 3, 4, 5, 6]).map(d => DAY_NAMES[d]).join(', ')}) at the same time each day to build habit`,
  ];
};

/**
 * Compute concrete daily session blocks from the generated weekly plans.
 * Runs entirely client-side so dates are accurate and the AI output stays compact.
 * Spans the full weeklyPlans range (which itself is capped at 26 weeks) — no
 * separate artificial cap here, otherwise sessions stop early and leave most
 * of the selected date range empty on the Calendar.
 */
const buildSuggestedSessions = (
  weeklyPlans: WeekPlan[],
  input: RoadmapInput,
): TimetableBlock[] => {
  const {
    availableStudyDays = [1, 2, 3, 4, 5, 6],
    preferredStartTime = '16:00',
    preferredEndTime = '20:00',
    sessionLengthMinutes = 60,
    breakLengthMinutes = 10,
    neurodivergentSupport = false,
    neurodivergentOptions,
  } = input;

  const effectiveSession =
    neurodivergentSupport && neurodivergentOptions?.shorterSessions
      ? Math.min(sessionLengthMinutes, 30)
      : sessionLengthMinutes;

  const effectiveBreak =
    neurodivergentSupport && neurodivergentOptions?.extraBreaks
      ? Math.max(breakLengthMinutes, 15)
      : breakLengthMinutes;

  const [startH, startM] = preferredStartTime.split(':').map(Number);
  const [endH, endM] = preferredEndTime.split(':').map(Number);
  const windowMinutes = endH * 60 + endM - (startH * 60 + startM);
  const sessionsPerDay = Math.max(1, Math.floor(windowMinutes / (effectiveSession + effectiveBreak)));

  const subject = input.subjects[0] ?? 'Study';
  const sessions: TimetableBlock[] = [];
  // Bounded by endDate ONLY — examDate has no influence on scheduling at all,
  // it's purely a separately-displayed target date.
  const scheduleEnd = new Date(input.endDate);
  const rangeStart = input.startDate ? new Date(input.startDate) : new Date();

  // Find the next available study day from the roadmap's start date (defaults to today)
  const current = new Date(rangeStart);
  for (let i = 0; i < 7; i++) {
    if (availableStudyDays.includes(current.getDay())) break;
    current.setDate(current.getDate() + 1);
  }

  // Paced week-by-week so sessions span the FULL date range instead of
  // packing all topics densely into the first few days and then stopping —
  // each day's session(s) draw from that calendar week's own topic bucket,
  // cycling within the week to fill every available slot that week. Weeks
  // with no topics (buffer weeks) simply get no sessions. Inclusive of
  // endDate itself — the study window runs through the end date, not up to
  // the day before it.
  while (current <= scheduleEnd) {
    if (availableStudyDays.includes(current.getDay())) {
      const daysSinceStart = Math.floor((current.getTime() - rangeStart.getTime()) / (24 * 60 * 60 * 1000));
      const weekIndex = Math.min(Math.floor(daysSinceStart / 7), weeklyPlans.length - 1);
      const weekTopics = weeklyPlans[weekIndex]?.topics ?? [];

      if (weekTopics.length > 0) {
        let slotStart = startH * 60 + startM;
        for (let s = 0; s < sessionsPerDay; s++) {
          const slotEnd = slotStart + effectiveSession;
          if (slotEnd > endH * 60 + endM) break;

          const sh = Math.floor(slotStart / 60);
          const sm = slotStart % 60;
          const eh = Math.floor(slotEnd / 60);
          const em = slotEnd % 60;

          sessions.push({
            date: current.toISOString().split('T')[0],
            day: DAY_NAMES[current.getDay()],
            startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
            endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
            duration: effectiveSession,
            subject,
            subjectId: input.subjectId,
            topic: weekTopics[s % weekTopics.length],
            status: 'scheduled',
          });

          slotStart = slotEnd + effectiveBreak;
        }
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return sessions;
};

export const generateStudyRoadmap = async (input: RoadmapInput): Promise<StudyRoadmap> => {
  if (!input.topicTags?.length) {
    throw new Error('NO_TOPICS: add topics to this subject before generating a roadmap');
  }

  if (!grokClient) {
    return generateDemoRoadmap(input);
  }

  // Decide which topics belong in which week ourselves — the AI only writes
  // the framing (focus/goals/tips) around a syllabus it never gets to choose.
  // The roadmap always spans the full selected [startDate, endDate] window,
  // never shrinks to however many topics exist — see scheduleTopicsAcrossWeeks.
  // examDate plays NO part in this — it's a separate target date, displayed
  // but never used for scheduling.
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const endDate = new Date(input.endDate);
  const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const calendarWeeks = Math.max(1, Math.min(Math.ceil(daysInRange / 7), 26));
  const contentWeeks = input.includeBufferDays ? Math.max(1, calendarWeeks - 1) : calendarWeeks;
  const topicBuckets = scheduleTopicsAcrossWeeks(buildTopicRefs(input), contentWeeks);
  const totalWeeks = calendarWeeks;
  const subject = input.subjects[0] ?? 'Study';
  const weeklyHours = (input.availableStudyDays?.length ?? 6) * input.studyHoursPerDay;

  try {
    const dayLabels = (input.availableStudyDays ?? [1, 2, 3, 4, 5, 6])
      .map(d => DAY_NAMES[d])
      .join(', ');

    const effectiveSession =
      input.neurodivergentSupport && input.neurodivergentOptions?.shorterSessions
        ? Math.min(input.sessionLengthMinutes, 30)
        : input.sessionLengthMinutes;

    const urgencyNote: Record<string, string> = {
      low:    'Relaxed pacing — prioritise thorough understanding over speed.',
      medium: 'Steady pacing — balance conceptual depth with topic coverage.',
      high:   'Intensive pacing — front-load high-yield topics; leave no gaps.',
    };

    const focusNote: Record<string, string> = {
      short: `Short focused sprints of ${effectiveSession} min — many small tasks per day.`,
      long:  `Extended deep-work blocks of ${effectiveSession} min — fewer, richer tasks per day.`,
      mixed: `Alternate short (30 min) and longer (${effectiveSession} min) sessions each day.`,
    };

    const ndBlock = input.neurodivergentSupport
      ? `\n**Neurodivergent Adaptations (MUST APPLY):**
- Write goals as single, unambiguous, completable checkboxes.
- Include one explicit "catch-up slot" per week in the goals.
- All tips must assume a low-distraction environment.`
      : '';

    const describeTopic = (t: TopicDetail) => (t.description ? `${t.name} (${t.description})` : t.name);

    const weekTopicLines = topicBuckets
      .map((b, i) => `Week ${i + 1}${b.isReview ? ' (SPACED REVIEW — already covered, write practice/retention goals, not first-time-learning goals)' : ''}: ${b.topics.map(describeTopic).join(' | ')}`)
      .join('\n');

    const prompt = `
You are an expert educational consultant. Your job is to SCHEDULE the student's own syllabus into a week-by-week plan — you do not choose, invent, rename, or drop any topic.

**Student Profile:**
- Subject: ${subject}
- Study Schedule Window: ${input.startDate} to ${input.endDate} (this plan covers ONLY this window)
- Exam Date: ${input.examDate}${input.examDate > input.endDate ? ' (after the study window ends — leave time for independent revision)' : ''}
- Current Level: ${input.currentLevel}
- Daily Study Hours: ${input.studyHoursPerDay} h/day
- Goals: ${input.goals || 'Excel in exams'}

**SYLLABUS — the only topics that exist, already assigned to weeks (do not add, remove, rename, split, or merge any):**
${weekTopicLines}

**Schedule Constraints:**
- Available Days: ${dayLabels}
- Study Window: ${input.preferredStartTime}–${input.preferredEndTime}
- Session Length: ${effectiveSession} min
- Break Between Sessions: ${input.breakLengthMinutes} min
- Effective Weekly Hours: ${weeklyHours} h
- Exam Urgency: ${input.examUrgency} — ${urgencyNote[input.examUrgency]}
- Session Focus Style: ${focusNote[input.focusPreference]}
${ndBlock}

**CRITICAL INSTRUCTIONS:**
1. Produce exactly ${topicBuckets.length} week entries, one per week listed above, in order.
2. Each week's "topics" array MUST be exactly the topic list given for that week above, verbatim, same order, nothing added or removed.
3. Write a short "focus" theme and 2-3 actionable "goals" for each week that reference only its own topics — for SPACED REVIEW weeks, write practice/retention-oriented goals instead of first-time-learning goals.
4. Set studyHours per week to exactly ${weeklyHours}.

**RETURN ONLY VALID JSON — no markdown, no comments:**
{
  "title": "Study Roadmap: ${subject}",
  "description": "${totalWeeks}-week plan through ${input.endDate}, ${weeklyHours} h/week on ${dayLabels}",
  "totalWeeks": ${topicBuckets.length},
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "${subject} — ${topicBuckets[0].topics[0].name}",
      "topics": ${JSON.stringify(topicBuckets[0].topics.map(t => t.name))},
      "goals": ["Cover all of this week's topics", "Solve targeted exercises for each"],
      "studyHours": ${weeklyHours}
    }
  ],
  "tips": [
    "Use active recall — close your notes and write down what you remember",
    "Study in your ${input.preferredStartTime}–${input.preferredEndTime} window every ${dayLabels.split(', ')[0]}",
    "After each ${effectiveSession}-minute session take a ${input.breakLengthMinutes}-minute break",
    "Track completed topics with a checkbox list for daily momentum"
  ]
}
`;

    const completion = await grokClient.chat.completions.create({
      model: 'grok-3',
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const cleaned = jsonMatch[0]
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1')
      .trim();

    const roadmapData = JSON.parse(cleaned);

    // Enforcement: the AI may only theme/phrase around the topics we assigned —
    // topics per week are always overwritten with our own buckets, never trusted
    // from the AI's output, so nothing invented or dropped can slip through.
    const weeklyPlans: WeekPlan[] = topicBuckets.map((bucket, i) => {
      const aiWeek = roadmapData?.weeklyPlans?.[i];
      const topicNames = bucket.topics.map(t => t.name);
      return {
        week: i + 1,
        focus: aiWeek?.focus || `${subject} — ${bucket.isReview ? 'Review: ' : ''}${topicNames[0]}`,
        topics: topicNames,
        topicIds: bucket.topics.map(t => t.topicId),
        goals: Array.isArray(aiWeek?.goals) && aiWeek.goals.length ? aiWeek.goals : [`Cover: ${topicNames.join(', ')}`],
        studyHours: typeof aiWeek?.studyHours === 'number' ? aiWeek.studyHours : weeklyHours,
      };
    });

    // Buffer week: reserves the last week of the selected range for pure
    // catch-up/consolidation — no new or repeated topics, so it never
    // conflicts with "only ever the user's real topics."
    if (input.includeBufferDays && calendarWeeks > contentWeeks) {
      weeklyPlans.push({
        week: calendarWeeks,
        focus: 'Buffer & Consolidation Week',
        topics: [],
        topicIds: [],
        goals: ['Revisit any incomplete topics from previous weeks', 'Final confidence check before the exam'],
        studyHours: Math.floor(weeklyHours * 0.5),
      });
    }

    const suggestedSessions = buildSuggestedSessions(weeklyPlans, input);

    return {
      id: `roadmap-${Date.now()}`,
      subjectId: input.subjectId,
      subjectName: subject,
      topicTags: input.topicTags,
      startDate: input.startDate ?? new Date().toISOString().split('T')[0],
      endDate: input.endDate,
      examDate: input.examDate,
      title: roadmapData?.title || `Study Roadmap: ${subject}`,
      // Always built from our own authoritative totalWeeks — never trust the AI's
      // own description text, which can state a stale/wrong week count even when
      // topics/weeklyPlans themselves are correct.
      description: `${totalWeeks}-week plan through ${input.endDate}, ${weeklyHours} h/week on ${dayLabels}`,
      totalWeeks,
      weeklyPlans,
      tips: Array.isArray(roadmapData?.tips) && roadmapData.tips.length ? roadmapData.tips : buildTips(input),
      suggestedSessions,
      createdAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const status = (error as { status?: number; response?: { status?: number } })?.status
      ?? (error as { status?: number; response?: { status?: number } })?.response?.status;
    if (status === 403 || status === 429) {
      console.warn(`Grok API returned ${status} (no credits / rate limit) — using demo roadmap`);
    } else {
      console.error('Error generating roadmap with Grok:', error);
    }
    return generateDemoRoadmap(input);
  }
};

const generateDemoRoadmap = (input: RoadmapInput): StudyRoadmap => {
  if (!input.topicTags?.length) {
    throw new Error('NO_TOPICS: add topics to this subject before generating a roadmap');
  }

  // Week count/scheduling derives from [startDate, endDate] only — examDate
  // is never used here, it's a separate display-only target date.
  const startDate = input.startDate ? new Date(input.startDate) : new Date();
  const endDate = new Date(input.endDate);
  const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const calendarWeeks = Math.max(1, Math.min(Math.ceil(daysInRange / 7), 26));
  const contentWeeks = input.includeBufferDays ? Math.max(1, calendarWeeks - 1) : calendarWeeks;
  const weeklyHours = (input.availableStudyDays?.length ?? 6) * input.studyHoursPerDay;
  const subject = input.subjects[0] ?? 'Study';

  const topicBuckets = scheduleTopicsAcrossWeeks(buildTopicRefs(input), contentWeeks);

  const weeklyPlans: WeekPlan[] = topicBuckets.map((bucket, idx) => {
    const week = idx + 1;
    const topicNames = bucket.topics.map(t => t.name);
    const label = bucket.isReview ? 'Review & practice' : topicNames[0];
    return {
      week,
      focus: `${subject} — ${label}${topicNames.length > 1 ? ` +${topicNames.length - 1} more` : ''}`,
      topics: topicNames,
      topicIds: bucket.topics.map(t => t.topicId),
      goals: bucket.isReview
        ? [`Revisit and practice: ${topicNames.join(', ')}`, 'Solve harder problems to test retention']
        : [`Cover all of this week's topics: ${topicNames.join(', ')}`, 'Solve targeted exercises for each'],
      studyHours: weeklyHours,
    };
  });

  // Explicit buffer week appended when requested — pure catch-up/consolidation,
  // no new or repeated topics, so it never conflicts with "only real topics."
  if (input.includeBufferDays && calendarWeeks > contentWeeks) {
    weeklyPlans.push({
      week: calendarWeeks,
      focus: 'Buffer & Consolidation Week',
      topics: [],
      topicIds: [],
      goals: ['Revisit any incomplete topics from previous weeks', 'Final confidence check before the exam'],
      studyHours: Math.floor(weeklyHours * 0.5),
    });
  }

  const tips = buildTips(input);
  const suggestedSessions = buildSuggestedSessions(weeklyPlans, input);

  return {
    id: `roadmap-${Date.now()}`,
    subjectId: input.subjectId,
    subjectName: input.subjects[0] ?? '',
    topicTags: input.topicTags,
    startDate: input.startDate ?? new Date().toISOString().split('T')[0],
    endDate: input.endDate,
    examDate: input.examDate,
    title: `${calendarWeeks}-Week Study Roadmap`,
    description: `A personalised ${calendarWeeks}-week plan covering ${input.subjects.join(', ')} — ${input.studyHoursPerDay} h/day on ${(input.availableStudyDays ?? [1, 2, 3, 4, 5, 6]).map(d => DAY_NAMES[d]).join(', ')}.`,
    totalWeeks: calendarWeeks,
    weeklyPlans,
    tips,
    suggestedSessions,
    createdAt: new Date().toISOString(),
  };
};

export default grokClient;
