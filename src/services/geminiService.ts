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

export interface RoadmapInput {
  subjects: string[];
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
  topic: string;
  status: 'scheduled' | 'completed' | 'skipped';
}

export interface WeekPlan {
  week: number;
  focus: string;
  topics: string[];
  goals: string[];
  studyHours: number;
}

export interface StudyRoadmap {
  id: string;
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
 * Compute concrete daily session blocks from the generated weekly plans.
 * Runs entirely client-side so dates are accurate and the AI output stays compact.
 * Generates up to 4 weeks of sessions to keep Firestore document size reasonable.
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

  // Flatten topics across all weeks, assigning a subject to each
  const allTopics: { topic: string; subject: string }[] = [];
  for (const plan of weeklyPlans) {
    const subjIdx = input.subjects.length > 0
      ? (plan.week - 1) % input.subjects.length
      : 0;
    const subject = input.subjects[subjIdx] ?? 'Study';
    for (const topic of plan.topics) {
      allTopics.push({ topic, subject });
    }
  }

  const sessions: TimetableBlock[] = [];
  const examDate = new Date(input.examDate);

  // Find the next available study day from today
  const current = new Date();
  for (let i = 0; i < 7; i++) {
    if (availableStudyDays.includes(current.getDay())) break;
    current.setDate(current.getDate() + 1);
  }

  // Cap at 4 weeks of sessions to keep data size manageable
  const maxSessions = Math.min(
    allTopics.length,
    sessionsPerDay * availableStudyDays.length * 4,
  );
  let topicIdx = 0;

  while (topicIdx < maxSessions && current < examDate) {
    if (availableStudyDays.includes(current.getDay())) {
      let slotStart = startH * 60 + startM;
      for (let s = 0; s < sessionsPerDay && topicIdx < maxSessions; s++) {
        const slotEnd = slotStart + effectiveSession;
        if (slotEnd > endH * 60 + endM) break;

        const sh = Math.floor(slotStart / 60);
        const sm = slotStart % 60;
        const eh = Math.floor(slotEnd / 60);
        const em = slotEnd % 60;

        const { topic, subject } = allTopics[topicIdx];
        sessions.push({
          date: current.toISOString().split('T')[0],
          day: DAY_NAMES[current.getDay()],
          startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
          endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
          duration: effectiveSession,
          subject,
          topic,
          status: 'scheduled',
        });

        topicIdx++;
        slotStart = slotEnd + effectiveBreak;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return sessions;
};

export const generateStudyRoadmap = async (input: RoadmapInput): Promise<StudyRoadmap> => {
  if (!grokClient) {
    return generateDemoRoadmap(input);
  }

  try {
    const examDate = new Date(input.examDate);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilExam = Math.max(1, Math.floor(daysUntilExam / 7));

    // Reserve last week as buffer if requested
    const totalWeeks = Math.max(
      1,
      Math.min(input.includeBufferDays ? weeksUntilExam - 1 : weeksUntilExam, 12),
    );

    const dayLabels = (input.availableStudyDays ?? [1, 2, 3, 4, 5, 6])
      .map(d => DAY_NAMES[d])
      .join(', ');

    const effectiveSession =
      input.neurodivergentSupport && input.neurodivergentOptions?.shorterSessions
        ? Math.min(input.sessionLengthMinutes, 30)
        : input.sessionLengthMinutes;

    const weeklyHours = (input.availableStudyDays?.length ?? 6) * input.studyHoursPerDay;

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
- Split each topic into sub-steps of maximum 25–30 minutes.
- Write goals as single, unambiguous, completable checkboxes.
- Include one explicit "catch-up slot" per week in the goals.
- All tips must assume a low-distraction environment.`
      : '';

    const prompt = `
You are an expert educational consultant. Create a DETAILED, SPECIFIC study roadmap.

**Student Profile:**
- Subjects: ${input.subjects.join(', ')}
- Exam Date: ${input.examDate} (${totalWeeks} study weeks from today)
- Current Level: ${input.currentLevel}
- Daily Study Hours: ${input.studyHoursPerDay} h/day
- Weak Areas: ${input.weakAreas?.join(', ') || 'Not specified'}
- Goals: ${input.goals || 'Excel in exams'}

**Schedule Constraints:**
- Available Days: ${dayLabels}
- Study Window: ${input.preferredStartTime}–${input.preferredEndTime}
- Session Length: ${effectiveSession} min
- Break Between Sessions: ${input.breakLengthMinutes} min
- Effective Weekly Hours: ${weeklyHours} h
- Exam Urgency: ${input.examUrgency} — ${urgencyNote[input.examUrgency]}
- Session Focus Style: ${focusNote[input.focusPreference]}
${input.includeBufferDays ? '- Last Week Is Buffer: DO NOT fill week ' + (totalWeeks + 1) + ' with new topics — the calendar page will add a buffer week automatically.' : ''}
${ndBlock}

**CRITICAL INSTRUCTIONS:**
1. Generate exactly ${totalWeeks} weeks (Week 1 … Week ${totalWeeks}).
2. Every topic must be SPECIFIC and ACTIONABLE — never generic.
3. Focus on weak areas: ${input.weakAreas?.length ? input.weakAreas.join(', ') : 'cover all fundamentals'}.
4. Set studyHours per week to exactly ${weeklyHours}.

**FORBIDDEN WORDS:** "Mock test", "Practice questions", "Sample papers", "Revision", "Review", "Test preparation"

**TOPIC FORMAT:**
✓ GOOD: "Learn HTML semantic tags (header, nav, article, section)"
✗ BAD: "Practice HTML", "Review CSS", "Mock test"

**WEEK STRUCTURE (urgency = ${input.examUrgency}):**
${input.examUrgency === 'high'
  ? `Weeks 1–${Math.ceil(totalWeeks * 0.5)}: Intensive concept acquisition\nWeeks ${Math.ceil(totalWeeks * 0.5) + 1}–${totalWeeks}: High-yield applied practice`
  : `Weeks 1–${Math.ceil(totalWeeks * 0.7)}: Core concept learning\nWeeks ${Math.ceil(totalWeeks * 0.7) + 1}–${totalWeeks}: Applied practice and problem solving`}

**RETURN ONLY VALID JSON — no markdown, no comments:**
{
  "title": "Study Roadmap: ${input.subjects.join(' & ')}",
  "description": "${totalWeeks}-week plan until ${input.examDate}, ${weeklyHours} h/week on ${dayLabels}",
  "totalWeeks": ${totalWeeks},
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "${input.subjects[0]} — ${input.weakAreas?.[0] ?? 'Fundamentals'}",
      "topics": ["Learn [specific concept 1]", "Understand [specific concept 2]", "Master [specific skill 3]", "Apply [specific technique 4]", "Build [specific mini-project 5]"],
      "goals": ["Finish all 5 topics", "Solve 10 targeted exercises"],
      "studyHours": ${weeklyHours}
    }
  ],
  "tips": [
    "Use active recall — close your notes and write down what you remember",
    "Study in your ${input.preferredStartTime}–${input.preferredEndTime} window every ${dayLabels.split(', ')[0]}",
    "After each ${effectiveSession}-minute session take a ${input.breakLengthMinutes}-minute break",
    "Prioritise ${input.weakAreas?.[0] ?? input.subjects[0]} in the first half of each week",
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
    const suggestedSessions = buildSuggestedSessions(roadmapData.weeklyPlans, input);

    return {
      id: `roadmap-${Date.now()}`,
      ...roadmapData,
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
  const today = new Date();
  const examDate = new Date(input.examDate);
  const weeksUntilExam = Math.ceil(
    (examDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  const rawWeeks = Math.min(weeksUntilExam, 12);
  const studyWeeks = input.includeBufferDays ? Math.max(1, rawWeeks - 1) : rawWeeks;
  const weeklyHours = (input.availableStudyDays?.length ?? 6) * input.studyHoursPerDay;

  const weeklyPlans: WeekPlan[] = [];

  for (let i = 1; i <= studyWeeks; i++) {
    const early = i <= studyWeeks * 0.6;
    const mid   = i > studyWeeks * 0.6 && i <= studyWeeks * 0.9;
    const subject  = input.subjects[(i - 1) % input.subjects.length];
    const weakArea = input.weakAreas?.[(i - 1) % (input.weakAreas.length || 1)];

    weeklyPlans.push({
      week: i,
      focus: early
        ? `${subject} — ${weakArea ?? 'Fundamentals'}`
        : mid
        ? `${subject} — Advanced ${weakArea ?? 'Concepts'}`
        : `${subject} — Final Preparation`,
      topics: early
        ? [
            `Understand ${weakArea ?? subject} basic concepts`,
            `Learn ${weakArea ?? subject} fundamental principles`,
            `Master ${weakArea ?? subject} core techniques`,
            `Practice ${weakArea ?? subject} basic exercises`,
            `Build simple ${subject} examples`,
          ]
        : mid
        ? [
            `Solve complex ${weakArea ?? subject} problems`,
            `Apply ${weakArea ?? subject} in real scenarios`,
            `Optimise ${weakArea ?? subject} solutions`,
            `Build advanced ${subject} projects`,
            `Debug ${weakArea ?? subject} edge cases`,
          ]
        : [
            `Speed drills for ${weakArea ?? subject}`,
            `Timed problem solving — ${subject}`,
            `Create ${subject} reference notes`,
            `Fix ${weakArea ?? subject} remaining weak points`,
            `Final ${subject} confidence building`,
          ],
      goals: [
        `Complete all ${weakArea ?? subject} topics`,
        `Solve 15+ exercises`,
        `Build 1 mini project`,
      ],
      studyHours: weeklyHours,
    });
  }

  // Explicit buffer week appended when requested
  if (input.includeBufferDays && rawWeeks > 1) {
    weeklyPlans.push({
      week: studyWeeks + 1,
      focus: 'Buffer & Consolidation Week',
      topics: [
        'Revisit any incomplete topics from previous weeks',
        'Strengthen the weakest areas identified during study',
        'Consolidate notes and key formula sheets',
        'Rest and mental preparation before exam day',
      ],
      goals: ['Clear all pending topics', 'Final confidence check'],
      studyHours: Math.floor(weeklyHours * 0.5),
    });
  }

  const nd = input.neurodivergentSupport ? input.neurodivergentOptions : null;

  const tips = [
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

  const suggestedSessions = buildSuggestedSessions(weeklyPlans, input);
  const displayWeeks = input.includeBufferDays && rawWeeks > 1 ? studyWeeks + 1 : studyWeeks;

  return {
    id: `roadmap-${Date.now()}`,
    title: `${displayWeeks}-Week Study Roadmap`,
    description: `A personalised ${displayWeeks}-week plan covering ${input.subjects.join(', ')} — ${input.studyHoursPerDay} h/day on ${(input.availableStudyDays ?? [1, 2, 3, 4, 5, 6]).map(d => DAY_NAMES[d]).join(', ')}.`,
    totalWeeks: displayWeeks,
    weeklyPlans,
    tips,
    suggestedSessions,
    createdAt: new Date().toISOString(),
  };
};

export default grokClient;
