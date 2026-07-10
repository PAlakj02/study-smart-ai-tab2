import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Types
export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  examDate?: string;
  totalTopics: number;
  completedTopics: number;
  progress: number;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  name: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  name: string;
  duration: number;
  status: 'pending' | 'in-progress' | 'completed' | 'revising';
  completed: boolean;
}

export interface Roadmap {
  id: string;
  userId: string;
  subjectId?: string;    // optional so pre-existing global roadmap docs still typecheck
  subjectName?: string;
  topicTags?: string[];
  startDate?: string;    // "YYYY-MM-DD" — user-selected, when the roadmap begins
  endDate?: string;      // "YYYY-MM-DD" — user-selected, when the study schedule finishes
  title: string;
  description: string;
  subjects: string[];
  examDate: string;      // "YYYY-MM-DD" — user-selected, the actual exam. Fully
                          // independent of startDate/endDate — may fall after endDate.
  studyHoursPerDay: number;
  weakAreas: string;
  studyStyle: string;
  goals: string;
  totalWeeks: number;
  weeklyPlans: WeeklyPlan[];
  tips: string[];
  createdAt: string;
  updatedAt: string;
  // Extended scheduling fields — optional for backward compatibility
  availableStudyDays?: number[];
  preferredStartTime?: string;
  preferredEndTime?: string;
  sessionLengthMinutes?: number;
  breakLengthMinutes?: number;
  examUrgency?: 'low' | 'medium' | 'high';
  focusPreference?: 'short' | 'long' | 'mixed';
  includeBufferDays?: boolean;
  neurodivergentSupport?: boolean;
  neurodivergentOptions?: Record<string, boolean>;
  suggestedSessions?: Array<{
    date: string;
    day: string;
    startTime: string;
    endTime: string;
    duration: number;
    subject: string;
    subjectId?: string;
    topic: string;
    status: string;
  }>;
}

export interface WeeklyPlan {
  week: number;
  focus: string;
  topics: string[];
  topicIds?: (string | undefined)[];
  goals: string[];
  goalsCompleted?: boolean[];
  notes?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  duration: number;
  date: string;       // "YYYY-MM-DD" for roadmap sessions; full ISO for Pomodoro sessions
  startTime?: string; // "HH:MM"
  endTime?: string;   // "HH:MM"
  status?: 'scheduled' | 'completed' | 'missed' | 'skipped';
  completed?: boolean;
  roadmapId?: string; // set when this session was generated from a roadmap
  createdAt: string;
}

/** Returns true only for plain objects — not FieldValue, Date, etc. */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && val.constructor === Object;
}

/** Recursively strip keys whose value is undefined — Firestore rejects them
 *  anywhere in a write, including inside arrays. Skips non-plain objects
 *  (FieldValue sentinels like serverTimestamp()) to preserve them.
 *
 *  Array elements that are `undefined` are converted to `null` rather than
 *  removed — removing them would shift every later index, which silently
 *  breaks arrays that rely on positional correspondence with a sibling array
 *  (e.g. WeekPlan.topicIds must stay index-aligned with WeekPlan.topics).
 *  `null` and `undefined` are both falsy, so existing reads like
 *  `topicIds?.[i] ? ... : ...` behave identically either way. */
function removeUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(v => (v === undefined ? null : removeUndefined(v))) as unknown as T;
  }
  if (isPlainObject(obj)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)]),
    ) as T;
  }
  return obj;
}

// Subjects
export const saveSubject = async (userId: string, subject: Omit<Subject, 'userId' | 'createdAt' | 'updatedAt'>) => {
  const subjectRef = doc(db, 'subjects', subject.id);
  await setDoc(subjectRef, removeUndefined({
    ...subject,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return subject.id;
};

export const updateSubject = async (subjectId: string, updates: Partial<Subject>) => {
  const subjectRef = doc(db, 'subjects', subjectId);
  await updateDoc(subjectRef, removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
};

export const deleteSubject = async (subjectId: string) => {
  const subjectRef = doc(db, 'subjects', subjectId);
  await deleteDoc(subjectRef);
};

export const getSubjects = async (userId: string): Promise<Subject[]> => {
  const subjectsRef = collection(db, 'subjects');
  const q = query(subjectsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as Subject;
  });
};

export const getSubject = async (subjectId: string): Promise<Subject | null> => {
  const subjectRef = doc(db, 'subjects', subjectId);
  const snapshot = await getDoc(subjectRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  } as Subject;
};

// Roadmaps
export const saveRoadmap = async (userId: string, roadmap: Omit<Roadmap, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
  const roadmapId = `roadmap_${Date.now()}`;
  const roadmapRef = doc(db, 'roadmaps', roadmapId);

  await setDoc(roadmapRef, removeUndefined({
    ...roadmap,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));

  // Cache the latest roadmap ID so getLatestRoadmap can skip the full collection scan
  await setDoc(doc(db, 'userPreferences', userId), { latestRoadmapId: roadmapId }, { merge: true });

  return roadmapId;
};

export const updateRoadmap = async (roadmapId: string, updates: Partial<Roadmap>) => {
  const roadmapRef = doc(db, 'roadmaps', roadmapId);
  await updateDoc(roadmapRef, removeUndefined({
    ...updates,
    updatedAt: serverTimestamp(),
  }) as Record<string, unknown>);
};

export const deleteRoadmap = async (roadmapId: string) => {
  const roadmapRef = doc(db, 'roadmaps', roadmapId);
  await deleteDoc(roadmapRef);
};

/** Runs write/delete operations across as many batches as needed to stay under
 *  Firestore's 500-ops-per-batch limit — a roadmap spanning many weeks with
 *  several sessions/day can easily exceed that in a single delete+recreate. */
async function commitInChunks(ops: Array<(batch: ReturnType<typeof writeBatch>) => void>) {
  const CHUNK_SIZE = 450;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    ops.slice(i, i + CHUNK_SIZE).forEach(op => op(batch));
    await batch.commit();
  }
}

/** Deletes every studySessions doc generated from this roadmap (via roadmapId). Leaves manually-added sessions untouched. */
export const deleteSessionsByRoadmap = async (roadmapId: string) => {
  const snapshot = await getDocs(
    query(collection(db, 'studySessions'), where('roadmapId', '==', roadmapId)),
  );
  if (snapshot.empty) return;
  await commitInChunks(snapshot.docs.map(d => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)));
};

export const getRoadmaps = async (userId: string): Promise<Roadmap[]> => {
  const roadmapsRef = collection(db, 'roadmaps');
  const q = query(roadmapsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as Roadmap;
  });
};

export const getRoadmap = async (roadmapId: string): Promise<Roadmap | null> => {
  const roadmapRef = doc(db, 'roadmaps', roadmapId);
  const snapshot = await getDoc(roadmapRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  } as Roadmap;
};

/** Pass `latestRoadmapId` from already-fetched preferences to avoid a redundant Firestore read */
export const getLatestRoadmap = async (userId: string, latestRoadmapId?: string): Promise<Roadmap | null> => {
  const candidateId = latestRoadmapId ?? (await getDoc(doc(db, 'userPreferences', userId))).data()?.latestRoadmapId;
  if (candidateId) {
    const snap = await getDoc(doc(db, 'roadmaps', candidateId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...data,
        id: snap.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Roadmap;
    }
  }
  // Fallback for old accounts without the cached ID
  const roadmaps = await getRoadmaps(userId);
  if (roadmaps.length === 0) return null;
  return roadmaps.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
};

/**
 * Groups every roadmap doc for this user by subjectId, keeping only the most
 * recent one per subject. Docs from before per-subject roadmaps existed (no
 * subjectId) each bucket under their own `legacy:<id>` key instead of colliding.
 * Grouping happens client-side deliberately — querying by subjectId + orderBy
 * would require a Firestore composite index that doesn't exist in this project.
 */
export const getLatestRoadmapsBySubject = async (userId: string): Promise<Record<string, Roadmap>> => {
  const roadmaps = await getRoadmaps(userId);
  const bySubject: Record<string, Roadmap> = {};
  for (const r of roadmaps) {
    const key = r.subjectId ?? `legacy:${r.id}`;
    const existing = bySubject[key];
    if (!existing || new Date(r.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      bySubject[key] = r;
    }
  }
  return bySubject;
};

// Study Sessions
export const saveStudySession = async (userId: string, session: Omit<StudySession, 'id' | 'userId' | 'createdAt'>) => {
  const sessionId = `session_${Date.now()}`;
  const sessionRef = doc(db, 'studySessions', sessionId);
  
  await setDoc(sessionRef, removeUndefined({
    ...session,
    userId,
    createdAt: serverTimestamp(),
  }));
  
  return sessionId;
};

export const getStudySessions = async (userId: string): Promise<StudySession[]> => {
  const sessionsRef = collection(db, 'studySessions');
  const q = query(sessionsRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
    } as StudySession;
  });
};

export const updateStudySession = async (sessionId: string, updates: Partial<StudySession>) => {
  const ref = doc(db, 'studySessions', sessionId);
  await updateDoc(ref, removeUndefined({ ...updates }) as Record<string, unknown>);
};

type TimetableEntry = {
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
  subject: string;
  subjectId?: string;
  topic: string;
  status: string;
};

/**
 * The single write path for turning a roadmap's session list into
 * studySessions docs. Always deletes-then-recreates rather than skipping when
 * sessions already exist, so it's equally correct at creation (nothing to
 * delete yet), on a full regenerate, and on a scoped edit:
 *
 * - `dateRange` omitted → replaces EVERY session belonging to this roadmap
 *   (used on create, and on roadmap delete via an empty `sessions` array).
 * - `dateRange` given → only sessions whose date falls inside
 *   [start, end] are deleted/recreated; sessions for this roadmap outside
 *   that window (and their completion status) are left untouched. Used when
 *   editing a single week, so unrelated weeks don't lose completion history.
 *
 * Deterministic doc IDs (rdmp_<roadmapId>_<date>_<HHMM>) plus the delete pass
 * guarantee no duplicate or orphaned session can survive a call to this
 * function.
 */
export const replaceSessionsForRoadmap = async (
  userId: string,
  roadmapId: string,
  sessions: TimetableEntry[],
  dateRange?: { start: string; end: string },
) => {
  const existing = await getDocs(
    query(collection(db, 'studySessions'), where('roadmapId', '==', roadmapId)),
  );
  const toDelete = dateRange
    ? existing.docs.filter(d => {
        const date = (d.data().date as string) ?? '';
        return date >= dateRange.start && date <= dateRange.end;
      })
    : existing.docs;

  const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = toDelete.map(
    d => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref),
  );
  for (const s of sessions) {
    const sessionId = `rdmp_${roadmapId}_${s.date}_${s.startTime.replace(':', '')}`;
    const ref = doc(db, 'studySessions', sessionId);
    ops.push(batch => batch.set(ref, removeUndefined({
      userId,
      roadmapId,
      subjectId: s.subjectId ?? '',
      subjectName: s.subject,
      topic: s.topic,
      duration: s.duration,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: 'scheduled',
      completed: false,
      createdAt: serverTimestamp(),
    })));
  }
  await commitInChunks(ops);
};

export const getStudySessionsByDate = async (userId: string, date: string): Promise<StudySession[]> => {
  const all = await getStudySessions(userId);
  return all.filter(s => s.date.substring(0, 10) === date);
};

// User Preferences
export interface GoalItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface UserPreferences {
  userId: string;
  // Legacy field from when "Total Study Hours" was a hand-maintained counter.
  // No longer read or written — it's now derived live from completed
  // studySessions durations. Kept optional only so old docs still typecheck.
  totalStudyHours?: number;
  weeklyGoal: number;
  dailyGoal: number;
  myGoals?: GoalItem[];
  // A single day's AI-suggested checklist — only ever holds "today's" list
  // (keyed by date so a new day naturally replaces it, not a growing history).
  todayChecklist?: { date: string; items: ChecklistItem[] };
  updatedAt: string;
}

export const saveUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  const prefsRef = doc(db, 'userPreferences', userId);
  await setDoc(prefsRef, removeUndefined({
    ...preferences,
    userId,
    updatedAt: serverTimestamp(),
  }), { merge: true });
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  const prefsRef = doc(db, 'userPreferences', userId);
  const snapshot = await getDoc(prefsRef);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return {
    ...data,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
  } as UserPreferences;
};

