import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { StudyRoadmap, WeekPlan, generateSessionsFromRoadmap } from '@/services/geminiService';
import { findNextAvailableSlot, findAvailableSlotInRange, SchedulingParams } from '@/services/scheduleUtils';
import { calculateCurrentStreak, calculateBestStreak } from '@/services/streakUtils';
import { useAuth } from './AuthContext';
import * as firestoreService from '@/services/firestoreService';
import { toast } from 'sonner';

/** Adds whole days to a "YYYY-MM-DD" string via UTC arithmetic — avoids the
 *  local-timezone off-by-one that `new Date(dateStr)` day math is prone to. */
const addDaysToDateStr = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

export type TopicStatus = 'pending' | 'in-progress' | 'completed' | 'revising';
export type ChapterDifficulty = 'easy' | 'medium' | 'hard';
export type ChapterLength = 'short' | 'medium' | 'long';

export interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  timeAllocated: number; // minutes
  timeSpent: number;     // minutes
  notes?: string;
  resources?: string[];
}

export interface Chapter {
  id: string;
  name: string;
  difficulty: ChapterDifficulty;
  length: ChapterLength;
  topics: Topic[];
  progress: number; // 0-100
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  examDate?: string;
  priority: number; // 1-5
  chapters: Chapter[];
  totalTopics: number;
  completedTopics: number;
  progress: number; // 0-100
}

export type SessionStatus = 'scheduled' | 'completed' | 'missed' | 'skipped';

export interface StudySession {
  id: string;
  subjectId: string;
  topicId?: string;       // optional — Pomodoro sessions may not have one
  date: string;           // "YYYY-MM-DD" for roadmap sessions; ISO string for Pomodoro
  startTime?: string;     // "HH:MM" — roadmap sessions only
  endTime?: string;       // "HH:MM" — roadmap sessions only
  duration: number;       // minutes
  completed: boolean;
  subjectName?: string;
  topic?: string;
  status?: SessionStatus;
  roadmapId?: string;
}

export interface StudyPreferences {
  dailyStudyHours: number;
  studyDays: number[]; // 0-6 (Sun-Sat)
  productiveHours: { start: string; end: string }[];
  breakPreference: 'short' | 'long' | 'none';
  studyStyle: 'short' | 'long';
  topicOrder: 'easy-first' | 'hard-first' | 'exam-wise';
}

interface StudyDataContextType {
  subjects: Subject[];
  sessions: StudySession[];
  preferences: StudyPreferences;
  totalStudyHours: number;
  roadmap: StudyRoadmap | null;
  roadmapsBySubjectId: Record<string, StudyRoadmap>;
  legacyRoadmaps: StudyRoadmap[];
  loading: boolean;
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  addSubject: (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'> & { id?: string }) => Promise<void>;
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addChapter: (subjectId: string, chapter: Omit<Chapter, 'id' | 'progress'>) => Promise<void>;
  updateChapter: (subjectId: string, chapterId: string, chapter: Partial<Chapter>) => Promise<void>;
  addTopic: (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => Promise<void>;
  addSubjectTopic: (subjectId: string, topic: { name: string; description?: string; timeAllocated: number }) => Promise<void>;
  updateTopic: (subjectId: string, chapterId: string, topicId: string, topic: Partial<Topic>) => Promise<void>;
  updateTopicStatus: (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => Promise<void>;
  addSession: (session: Omit<StudySession, 'id'>) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  completeStudySession: (sessionId: string) => Promise<void>;
  updateStudySession: (sessionId: string, updates: Partial<StudySession>) => Promise<void>;
  markSessionMissed: (sessionId: string) => Promise<void>;
  markSessionSkipped: (sessionId: string) => Promise<void>;
  rescheduleSession: (sessionId: string) => Promise<void>;
  moveMissedSessionToCatchUp: (sessionId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<StudyPreferences>) => Promise<void>;
  saveRoadmap: (roadmap: StudyRoadmap) => Promise<void>;
  updateRoadmapWeek: (
    subjectId: string,
    weekIndex: number,
    weekUpdates: Partial<Pick<WeekPlan, 'focus' | 'topics' | 'topicIds' | 'goals' | 'notes'>>,
  ) => Promise<void>;
  deleteRoadmap: (subjectId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  myGoals: firestoreService.GoalItem[];
  addGoal: (text: string) => Promise<void>;
  toggleGoal: (id: string) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  todayChecklist: { date: string; items: firestoreService.ChecklistItem[] } | null;
  setTodayChecklistItems: (date: string, items: firestoreService.ChecklistItem[]) => Promise<void>;
  toggleChecklistItem: (id: string) => Promise<void>;
  lastRoadmapNDSettings: { neurodivergentSupport: boolean; neurodivergentOptions: Record<string, boolean> } | null;
  saveLastRoadmapNDSettings: (neurodivergentSupport: boolean, neurodivergentOptions: Record<string, boolean>) => Promise<void>;
}

const StudyDataContext = createContext<StudyDataContextType | undefined>(undefined);

export const StudyDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [preferences, setPreferences] = useState<StudyPreferences>({
    dailyStudyHours: 6,
    studyDays: [1, 2, 3, 4, 5, 6],
    productiveHours: [
      { start: '06:00', end: '09:00' },
      { start: '16:00', end: '20:00' },
    ],
    breakPreference: 'short',
    studyStyle: 'long',
    topicOrder: 'hard-first',
  });
  // Derived, not stored — always the real sum of completed sessions' minutes,
  // recomputed whenever `sessions` changes. Previously this was a hand-
  // maintained counter seeded once from EVERY session's duration (including
  // future/not-yet-completed ones) and then incremented on each completion,
  // which could show hours for work that was only scheduled, never done.
  const totalStudyHours = useMemo(
    () => Math.round(sessions.filter(s => s.completed).reduce((sum, s) => sum + s.duration, 0) / 60),
    [sessions],
  );
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);
  const [roadmapsBySubjectId, setRoadmapsBySubjectId] = useState<Record<string, StudyRoadmap>>({});
  const [legacyRoadmaps, setLegacyRoadmaps] = useState<StudyRoadmap[]>([]);
  const [myGoals, setMyGoals] = useState<firestoreService.GoalItem[]>([]);
  const [todayChecklist, setTodayChecklist] = useState<{ date: string; items: firestoreService.ChecklistItem[] } | null>(null);
  const [lastRoadmapNDSettings, setLastRoadmapNDSettings] = useState<{ neurodivergentSupport: boolean; neurodivergentOptions: Record<string, boolean> } | null>(null);
  const [loading, setLoading] = useState(true);

  /** Splits the subjectId-keyed map from firestoreService into real-subject vs legacy buckets,
   *  and derives the singular "most recent" roadmap kept for backward-compatible readers. */
  const applyRoadmapsBySubject = (bySubjectId: Record<string, firestoreService.Roadmap>) => {
    const map: Record<string, StudyRoadmap> = {};
    const legacy: StudyRoadmap[] = [];
    for (const [key, r] of Object.entries(bySubjectId)) {
      const asStudyRoadmap = r as unknown as StudyRoadmap;
      if (key.startsWith('legacy:')) legacy.push(asStudyRoadmap);
      else map[key] = asStudyRoadmap;
    }
    setRoadmapsBySubjectId(map);
    setLegacyRoadmaps(legacy);
    const mostRecent = [...Object.values(map), ...legacy]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    setRoadmap(mostRecent ?? null);
  };

  /** Firestore StudySession → context StudySession — the one place this shape
   *  translation happens, reused by every load/refresh path so they can never
   *  drift out of sync with each other. */
  const mapSessions = (raw: firestoreService.StudySession[]): StudySession[] =>
    raw.map(s => ({
      id: s.id,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      topic: s.topic,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      completed: s.completed ?? false,
      status: (s.status as SessionStatus) ?? (s.completed ? 'completed' : 'scheduled'),
      roadmapId: s.roadmapId,
    }));

  /** Re-pulls the full session list from Firestore and replaces local state
   *  wholesale. This is the ONLY way `sessions` is ever updated after the
   *  initial load — every roadmap create/edit/delete calls this afterwards
   *  instead of hand-patching the array, so Dashboard, Calendar, and
   *  Analytics (all consumers of the same `sessions` value) can never drift
   *  out of sync with what's actually in Firestore or with each other. */
  const refreshSessions = async () => {
    if (!user) return;
    const updated = await firestoreService.getStudySessions(user.id);
    setSessions(mapSessions(updated));
  };

  // Load all data from Firestore when user authenticates
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setSubjects([]);
        setSessions([]);
        setRoadmap(null);
        setRoadmapsBySubjectId({});
        setLegacyRoadmaps([]);
        setMyGoals([]);
        setTodayChecklist(null);
        setLastRoadmapNDSettings(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const [userSubjects, userSessions, userPrefs, roadmapsBySubject] = await Promise.all([
          firestoreService.getSubjects(user.id),
          firestoreService.getStudySessions(user.id),
          firestoreService.getUserPreferences(user.id),
          firestoreService.getLatestRoadmapsBySubject(user.id),
        ]);

        setSubjects(userSubjects);
        applyRoadmapsBySubject(roadmapsBySubject);
        setSessions(mapSessions(userSessions));
        setMyGoals(userPrefs?.myGoals ?? []);
        setTodayChecklist(userPrefs?.todayChecklist ?? null);
        setLastRoadmapNDSettings(userPrefs?.lastRoadmapNDSettings ?? null);
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load your data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    try {
      const [userSubjects, userSessions] = await Promise.all([
        firestoreService.getSubjects(user.id),
        firestoreService.getStudySessions(user.id),
      ]);
      setSubjects(userSubjects);
      setSessions(mapSessions(userSessions));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const addSubject = async (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'> & { id?: string }) => {
    if (!user) return;

    // Firestore rejects undefined values — strip examDate if empty
    const { examDate, id, ...rest } = subject as typeof subject & { examDate?: string; id?: string };
    const newSubject = {
      ...rest,
      ...(examDate ? { examDate } : {}),
      id: id ?? `subject_${Date.now()}`,
      userId: user.id,
      totalTopics: 0,
      completedTopics: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await firestoreService.saveSubject(user.id, newSubject as any);
      setSubjects(prev => [...prev, newSubject as unknown as Subject]);
      toast.success('Subject added successfully');
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
    }
  };

  const updateSubject = async (id: string, updatedSubject: Partial<Subject>) => {
    if (!user) return;
    try {
      await firestoreService.updateSubject(id, updatedSubject as any);
      setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...updatedSubject } : s));
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject');
    }
  };

  const deleteSubject = async (id: string) => {
    if (!user) return;
    try {
      await firestoreService.deleteSubject(id);
      const updatedSubjects = subjects.filter(s => s.id !== id);
      setSubjects(updatedSubjects);
      const subjectRoadmap = roadmapsBySubjectId[id];
      if (subjectRoadmap?.id) {
        await firestoreService.deleteRoadmap(subjectRoadmap.id);
        setRoadmapsBySubjectId(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      toast.success('Subject deleted');
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    }
  };

  const addChapter = async (subjectId: string, chapter: Omit<Chapter, 'id' | 'progress'>) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newChapter: Chapter = { ...chapter, id: `${subjectId}-${Date.now()}`, progress: 0 };
    const updatedSubject = { ...subject, chapters: [...subject.chapters, newChapter] };

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedSubject.chapters } as any);
      setSubjects(prev => prev.map(s => s.id === subjectId ? updatedSubject : s));
      toast.success('Chapter added');
    } catch (error) {
      console.error('Error adding chapter:', error);
      toast.error('Failed to add chapter');
    }
  };

  const updateChapter = async (subjectId: string, chapterId: string, updatedChapter: Partial<Chapter>) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedChapters = subject.chapters.map(c =>
      c.id === chapterId ? { ...c, ...updatedChapter } : c,
    );

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedChapters } as any);
      setSubjects(prev => prev.map(s => s.id === subjectId ? { ...s, chapters: updatedChapters } : s));
    } catch (error) {
      console.error('Error updating chapter:', error);
      toast.error('Failed to update chapter');
    }
  };

  const addTopic = async (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newTopic: Topic = { ...topic, id: `${chapterId}-${Date.now()}` };
    const updatedChapters = subject.chapters.map(c =>
      c.id === chapterId ? { ...c, topics: [...c.topics, newTopic] } : c,
    );

    const totalTopics = updatedChapters.reduce((sum, c) => sum + c.topics.length, 0);
    const completedTopics = updatedChapters.reduce(
      (sum, c) => sum + c.topics.filter(t => t.status === 'completed').length,
      0,
    );
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedChapters, totalTopics, completedTopics, progress } as any);
      setSubjects(prev =>
        prev.map(s => s.id === subjectId ? { ...s, chapters: updatedChapters, totalTopics, completedTopics, progress } : s),
      );
      toast.success('Topic added');
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    }
  };

  /** Default chapter id used to hold all user-added topics for a subject — an
   *  internal implementation detail; the UI only ever presents Subject → Topics. */
  const defaultChapterId = (subjectId: string) => `${subjectId}__default`;

  const addSubjectTopic = async (
    subjectId: string,
    topic: { name: string; description?: string; timeAllocated: number },
  ) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const chapterId = defaultChapterId(subjectId);
    const newTopic: Topic = {
      id: `${chapterId}-${Date.now()}`,
      name: topic.name,
      status: 'pending',
      timeAllocated: topic.timeAllocated,
      timeSpent: 0,
      notes: topic.description || undefined,
    };

    const hasDefaultChapter = subject.chapters.some(c => c.id === chapterId);
    const updatedChapters = hasDefaultChapter
      ? subject.chapters.map(c => c.id === chapterId ? { ...c, topics: [...c.topics, newTopic] } : c)
      : [...subject.chapters, { id: chapterId, name: 'Topics', difficulty: 'medium' as ChapterDifficulty, length: 'medium' as ChapterLength, topics: [newTopic], progress: 0 }];

    const totalTopics = updatedChapters.reduce((sum, c) => sum + c.topics.length, 0);
    const completedTopics = updatedChapters.reduce(
      (sum, c) => sum + c.topics.filter(t => t.status === 'completed').length,
      0,
    );
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedChapters, totalTopics, completedTopics, progress } as any);
      setSubjects(prev =>
        prev.map(s => s.id === subjectId ? { ...s, chapters: updatedChapters, totalTopics, completedTopics, progress } : s),
      );
      toast.success('Topic added');
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error('Failed to add topic');
    }
  };

  const updateTopic = async (subjectId: string, chapterId: string, topicId: string, updatedTopic: Partial<Topic>) => {
    if (!user) return;
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const updatedChapters = subject.chapters.map(c =>
      c.id === chapterId
        ? { ...c, topics: c.topics.map(t => t.id === topicId ? { ...t, ...updatedTopic } : t) }
        : c,
    );

    const totalTopics = updatedChapters.reduce((sum, c) => sum + c.topics.length, 0);
    const completedTopics = updatedChapters.reduce(
      (sum, c) => sum + c.topics.filter(t => t.status === 'completed').length,
      0,
    );
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedChapters, totalTopics, completedTopics, progress } as any);
      setSubjects(prev =>
        prev.map(s => s.id === subjectId ? { ...s, chapters: updatedChapters, totalTopics, completedTopics, progress } : s),
      );
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    }
  };

  const updateTopicStatus = async (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => {
    if (!user) return;

    const subject = subjects.find(s => s.id === subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    const topic = chapter?.topics.find(t => t.id === topicId);
    const previousStatus = topic?.status;

    await updateTopic(subjectId, chapterId, topicId, { status });

    // Total Study Hours is derived purely from completed *sessions* (see the
    // totalStudyHours useMemo above) — marking a topic's status here doesn't
    // credit hours on its own, since that would double-count time already
    // credited when its scheduled sessions get marked complete.
    if (status === 'completed' && previousStatus !== 'completed' && topic?.timeAllocated) {
      toast.success('Topic marked as complete! 🎉');
    }
  };

  const addSession = async (session: Omit<StudySession, 'id'>) => {
    if (!user) return;

    const newSession: StudySession = { ...session, id: `session_${Date.now()}` };

    try {
      const subject = subjects.find(s => s.id === session.subjectId);
      const subjectName = session.subjectName ?? subject?.name ?? 'Unknown';

      await firestoreService.saveStudySession(user.id, {
        subjectId: session.subjectId,
        subjectName,
        topic: session.topic ?? '',
        duration: session.duration,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status ?? 'completed',
        completed: session.completed ?? true,
      });

      // totalStudyHours picks this up automatically since it's derived from
      // `sessions` — no separate counter to update.
      setSessions(prev => [...prev, newSession]);
    } catch (error) {
      console.error('Error adding session:', error);
      toast.error('Failed to save study session');
    }
  };

  // Legacy alias kept for Pomodoro page compatibility
  const completeSession = async (sessionId: string) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, completed: true } : s));
  };

  const completeStudySession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.completed) return;

    // Optimistic update
    setSessions(prev =>
      prev.map(s => s.id === sessionId ? { ...s, completed: true, status: 'completed' as SessionStatus } : s),
    );

    try {
      await firestoreService.updateStudySession(sessionId, { completed: true, status: 'completed' });

      // totalStudyHours recomputes on its own from the `sessions` state
      // update above — no separate counter to credit.
      toast.success('Session completed! 🎉', {
        description: `+${session.duration} min added to your study hours`,
      });
    } catch (error) {
      // Revert on failure
      setSessions(prev =>
        prev.map(s => s.id === sessionId ? { ...s, completed: false, status: 'scheduled' as SessionStatus } : s),
      );
      console.error('Error completing session:', error);
      toast.error('Failed to update session');
    }
  };

  const updateStudySession = async (sessionId: string, updates: Partial<StudySession>) => {
    try {
      await firestoreService.updateStudySession(sessionId, updates as any);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Failed to update session');
    }
  };

  const markSessionMissed = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status === 'missed') return;
    // Optimistic update
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'missed' as SessionStatus } : s));
    try {
      await firestoreService.updateStudySession(sessionId, { status: 'missed' });
      toast.info('Session marked as missed');
    } catch {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: session.status } : s));
      toast.error('Failed to update session');
    }
  };

  const markSessionSkipped = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status === 'skipped') return;
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'skipped' as SessionStatus } : s));
    try {
      await firestoreService.updateStudySession(sessionId, { status: 'skipped' });
      toast.info('Session skipped');
    } catch {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: session.status } : s));
      toast.error('Failed to update session');
    }
  };

  const rescheduleSession = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Scheduling params — use roadmap fields with sensible defaults for old roadmaps
    const params: SchedulingParams = {
      availableStudyDays: roadmap?.availableStudyDays ?? [1, 2, 3, 4, 5, 6],
      preferredStartTime:  roadmap?.preferredStartTime  ?? '16:00',
      preferredEndTime:    roadmap?.preferredEndTime    ?? '20:00',
      breakLengthMinutes:  roadmap?.breakLengthMinutes  ?? 10,
    };

    // Occupied slots: all non-missed/skipped sessions with time info
    const occupied = sessions
      .filter(s => s.id !== sessionId && s.startTime && s.endTime &&
                   s.status !== 'missed' && s.status !== 'skipped')
      .map(s => ({ date: s.date.substring(0, 10), startTime: s.startTime!, endTime: s.endTime! }));

    const slot = findNextAvailableSlot(occupied, params, new Date(), session.duration);

    if (!slot) {
      toast.error('No available slot found in the next 60 days');
      return;
    }

    try {
      // Mark original as missed if not already missed/skipped
      if (session.status !== 'missed' && session.status !== 'skipped') {
        await firestoreService.updateStudySession(sessionId, { status: 'missed' });
      }

      // Save rescheduled session
      const newId = await firestoreService.saveStudySession(user.id, {
        subjectId:   session.subjectId,
        subjectName: session.subjectName,
        topic:       session.topic,
        duration:    session.duration,
        date:        slot.date,
        startTime:   slot.startTime,
        endTime:     slot.endTime,
        status:      'scheduled',
        completed:   false,
        roadmapId:   session.roadmapId,
      });

      // Update local state atomically
      setSessions(prev => [
        ...prev.map(s =>
          s.id === sessionId
            ? { ...s, status: 'missed' as SessionStatus }
            : s,
        ),
        {
          id:          newId,
          subjectId:   session.subjectId,
          subjectName: session.subjectName,
          topic:       session.topic,
          duration:    session.duration,
          date:        slot.date,
          startTime:   slot.startTime,
          endTime:     slot.endTime,
          status:      'scheduled' as SessionStatus,
          completed:   false,
          roadmapId:   session.roadmapId,
        },
      ]);

      toast.success('Session rescheduled', {
        description: `Moved to ${slot.date} at ${slot.startTime}`,
      });
    } catch {
      toast.error('Failed to reschedule session');
    }
  };

  // The real behaviour behind "Flexible catch-up": moves a missed session
  // INTO its own roadmap's reserved buffer/catch-up week — not just anywhere
  // in the next 60 days like the generic reschedule above. Updates the
  // existing session doc in place (date/time only) rather than creating a
  // new one and leaving the old as "missed", so no duplicate is ever left
  // behind for the same piece of work.
  const moveMissedSessionToCatchUp = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const rm = session.roadmapId
      ? Object.values(roadmapsBySubjectId).find(r => r.id === session.roadmapId)
        ?? legacyRoadmaps.find(r => r.id === session.roadmapId)
      : undefined;
    if (!rm?.neurodivergentOptions?.flexibleCatchUp) {
      toast.error('No catch-up slot available for this session');
      return;
    }

    // Same weekIndex bucketing generateSessionsFromRoadmap/buildSuggestedSessions
    // use — the week the MISSED session originally fell in reserved its own
    // catch-up day at generation time, so search that week's range first
    // rather than jumping to some other week.
    const daysSinceStart = Math.floor(
      (new Date(session.date.substring(0, 10)).getTime() - new Date(rm.startDate).getTime()) / (24 * 60 * 60 * 1000),
    );
    const weekIndex = Math.min(Math.max(0, Math.floor(daysSinceStart / 7)), rm.weeklyPlans.length - 1);
    const isLastWeek = weekIndex === rm.weeklyPlans.length - 1;
    const weekStart = addDaysToDateStr(rm.startDate, weekIndex * 7);
    const naturalWeekEnd = addDaysToDateStr(rm.startDate, weekIndex * 7 + 6);
    const weekEnd = isLastWeek ? rm.endDate : (naturalWeekEnd > rm.endDate ? rm.endDate : naturalWeekEnd);

    const params: SchedulingParams = {
      availableStudyDays: rm.availableStudyDays ?? [1, 2, 3, 4, 5, 6],
      preferredStartTime: rm.preferredStartTime ?? '16:00',
      preferredEndTime: rm.preferredEndTime ?? '20:00',
      breakLengthMinutes: rm.breakLengthMinutes ?? 10,
    };
    const occupied = sessions
      .filter(s => s.id !== sessionId && s.startTime && s.endTime && s.status !== 'missed' && s.status !== 'skipped')
      .map(s => ({ date: s.date.substring(0, 10), startTime: s.startTime!, endTime: s.endTime! }));

    const slot = findAvailableSlotInRange(occupied, params, weekStart, weekEnd, session.duration);
    if (!slot) {
      toast.error('No open catch-up slot found this week — try the regular Reschedule instead');
      return;
    }

    const previous = { date: session.date, startTime: session.startTime, endTime: session.endTime, status: session.status };
    setSessions(prev => prev.map(s => s.id === sessionId
      ? { ...s, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, status: 'scheduled' as SessionStatus }
      : s));
    try {
      await firestoreService.updateStudySession(sessionId, {
        date: slot.date, startTime: slot.startTime, endTime: slot.endTime, status: 'scheduled',
      });
      toast.success('Moved to this week’s catch-up slot', { description: `${slot.date} at ${slot.startTime}` });
    } catch (error) {
      console.error('Error moving session to catch-up slot:', error);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...previous } : s));
      toast.error('Failed to move session');
    }
  };

  const updatePreferences = async (newPreferences: Partial<StudyPreferences>) => {
    if (!user) return;
    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);
    try {
      await firestoreService.saveUserPreferences(user.id, {
        dailyGoal: newPreferences.dailyStudyHours,
        weeklyGoal: (newPreferences.dailyStudyHours ?? 0) * (newPreferences.studyDays?.length ?? 6),
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  // ── My Goals — a small persistent personal checklist, stored alongside the
  //    user's other preferences (no new collection needed) ──────────────────
  const addGoal = async (text: string) => {
    if (!user || !text.trim()) return;
    const newGoal: firestoreService.GoalItem = {
      id: `goal_${Date.now()}`,
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [...myGoals, newGoal];
    setMyGoals(updated);
    try {
      await firestoreService.saveUserPreferences(user.id, { myGoals: updated });
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    }
  };

  const toggleGoal = async (id: string) => {
    if (!user) return;
    const updated = myGoals.map(g => g.id === id ? { ...g, completed: !g.completed } : g);
    setMyGoals(updated);
    try {
      await firestoreService.saveUserPreferences(user.id, { myGoals: updated });
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
    }
  };

  const removeGoal = async (id: string) => {
    if (!user) return;
    const updated = myGoals.filter(g => g.id !== id);
    setMyGoals(updated);
    try {
      await firestoreService.saveUserPreferences(user.id, { myGoals: updated });
    } catch (error) {
      console.error('Error removing goal:', error);
      toast.error('Failed to remove goal');
    }
  };

  // ── Today's Checklist — a single persisted day's AI-suggested checklist.
  //    Replaced wholesale (not accumulated) whenever the date rolls over. ────
  const setTodayChecklistItems = async (date: string, items: firestoreService.ChecklistItem[]) => {
    if (!user) return;
    const value = { date, items };
    setTodayChecklist(value);
    try {
      await firestoreService.saveUserPreferences(user.id, { todayChecklist: value });
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast.error('Failed to save checklist');
    }
  };

  const toggleChecklistItem = async (id: string) => {
    if (!user || !todayChecklist) return;
    const updated = { ...todayChecklist, items: todayChecklist.items.map(i => i.id === id ? { ...i, completed: !i.completed } : i) };
    setTodayChecklist(updated);
    try {
      await firestoreService.saveUserPreferences(user.id, { todayChecklist: updated });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast.error('Failed to update checklist');
    }
  };

  // Remembers the neurodivergent-support toggle/options used for the most
  // recent roadmap generation, so the Roadmap Generator can pre-fill them
  // next time instead of always resetting to defaults. Only affects future
  // generations — never touches already-generated or manually edited sessions.
  const saveLastRoadmapNDSettings = async (
    neurodivergentSupport: boolean,
    neurodivergentOptions: Record<string, boolean>,
  ) => {
    if (!user) return;
    const value = { neurodivergentSupport, neurodivergentOptions };
    setLastRoadmapNDSettings(value);
    try {
      await firestoreService.saveUserPreferences(user.id, { lastRoadmapNDSettings: value });
    } catch (error) {
      console.error('Error saving neurodivergent preferences:', error);
    }
  };

  const saveRoadmap = async (newRoadmap: StudyRoadmap) => {
    if (!user) throw new Error('Not authenticated');

    // Strip suggestedSessions from the roadmap document — they are stored as
    // individual studySessions docs and embedding them causes large writes +
    // potential undefined-field errors inside nested objects.
    const { suggestedSessions, ...roadmapForFirestore } = newRoadmap;

    const roadmapId = await firestoreService.saveRoadmap(user.id, roadmapForFirestore as any);
    // Update context state only after successful Firestore write
    const savedRoadmap = { ...newRoadmap, id: roadmapId };
    setRoadmap(savedRoadmap);
    if (savedRoadmap.subjectId) {
      setRoadmapsBySubjectId(prev => ({ ...prev, [savedRoadmap.subjectId]: savedRoadmap }));
    }

    // Persist session blocks — this roadmap's docs are freshly created, so
    // there's nothing to delete yet, but going through the same replace path
    // used for edits/deletes keeps session writes on a single code path.
    if (suggestedSessions && suggestedSessions.length > 0) {
      try {
        await firestoreService.replaceSessionsForRoadmap(user.id, roadmapId, suggestedSessions);
      } catch (sessionError) {
        console.error('Sessions save failed (roadmap saved OK):', sessionError);
      }
      // Reload regardless so Dashboard, Calendar, and Analytics all pick up
      // exactly what's in Firestore, not an assumed-successful local write.
      try {
        await refreshSessions();
      } catch (reloadError) {
        console.error('Session reload failed:', reloadError);
      }
    }
    // Caller is responsible for showing the success toast
  };

  // ── Edit a single week of an already-saved roadmap (focus, topics, goals,
  //    notes) — reuses the existing roadmap doc + updateRoadmap, no new
  //    collection. Updates local state first so the UI (this panel, the week
  //    timeline, "This Week" progress) reflects the change immediately, then
  //    regenerates ONLY that week's studySessions docs from the updated
  //    topics — via firestoreService.replaceSessionsForRoadmap scoped to that
  //    week's date range — so Calendar/Dashboard/Analytics can never show
  //    sessions for topics that no longer exist in the roadmap. Other weeks'
  //    sessions (and their completion history) are left untouched since
  //    nothing about them changed. ───────────────────────────────────────
  const updateRoadmapWeek = async (
    subjectId: string,
    weekIndex: number,
    weekUpdates: Partial<Pick<WeekPlan, 'focus' | 'topics' | 'topicIds' | 'goals' | 'notes'>>,
  ) => {
    if (!user) return;
    const existing = roadmapsBySubjectId[subjectId];
    if (!existing || !existing.weeklyPlans[weekIndex]) return;

    const updatedWeeklyPlans = existing.weeklyPlans.map((w, i) =>
      i === weekIndex ? { ...w, ...weekUpdates } : w,
    );
    const updatedRoadmap = { ...existing, weeklyPlans: updatedWeeklyPlans };

    setRoadmapsBySubjectId(prev => ({ ...prev, [subjectId]: updatedRoadmap }));
    if (roadmap?.id === existing.id) setRoadmap(updatedRoadmap);

    try {
      await firestoreService.updateRoadmap(existing.id, { weeklyPlans: updatedWeeklyPlans } as any);
    } catch (error) {
      console.error('Error updating week:', error);
      toast.error('Failed to save week — reverting');
      setRoadmapsBySubjectId(prev => ({ ...prev, [subjectId]: existing }));
      if (roadmap?.id === existing.id) setRoadmap(existing);
      return;
    }

    // Same weekIndex bucketing rule buildSuggestedSessions uses: every day
    // from startDate + weekIndex*7 through +6 belongs to this week, except
    // the LAST week, which absorbs every remaining day through endDate.
    const isLastWeek = weekIndex === updatedWeeklyPlans.length - 1;
    const weekStart = addDaysToDateStr(existing.startDate, weekIndex * 7);
    const naturalWeekEnd = addDaysToDateStr(existing.startDate, weekIndex * 7 + 6);
    const weekEnd = isLastWeek
      ? existing.endDate
      : (naturalWeekEnd > existing.endDate ? existing.endDate : naturalWeekEnd);

    try {
      const freshSessions = generateSessionsFromRoadmap(updatedRoadmap)
        .filter(s => s.date >= weekStart && s.date <= weekEnd);
      await firestoreService.replaceSessionsForRoadmap(user.id, existing.id, freshSessions, {
        start: weekStart,
        end: weekEnd,
      });
      await refreshSessions();
      toast.success('Week updated');
    } catch (sessionError) {
      console.error('Error regenerating sessions for edited week:', sessionError);
      toast.error('Week saved, but its calendar sessions failed to update');
    }
  };

  // Deletes only the roadmap doc + its generated sessions for one subject.
  // The subject, its chapters/topics, and any other subjects' data are left
  // untouched, so a fresh roadmap can be generated for the same subject right
  // after without recreating anything.
  const deleteRoadmap = async (subjectId: string) => {
    if (!user) return;
    const existing = roadmapsBySubjectId[subjectId];
    if (!existing?.id) return;

    // Sessions first, roadmap doc second — if the roadmap delete were to fail
    // after sessions were already gone, the worst case is an orphaned roadmap
    // doc, not orphaned sessions with no owning roadmap. Neither Firestore
    // call nor local state is touched until both writes succeed, so a partial
    // failure never leaves the UI claiming a deletion that didn't happen.
    try {
      await firestoreService.deleteSessionsByRoadmap(existing.id);
      await firestoreService.deleteRoadmap(existing.id);
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
      return;
    }

    setRoadmapsBySubjectId(prev => {
      const next = { ...prev };
      delete next[subjectId];
      return next;
    });
    if (roadmap?.id === existing.id) setRoadmap(null);

    // Re-pull the session list from Firestore itself rather than trusting an
    // optimistic local filter, so every consumer (Calendar included) renders
    // exactly what's currently in the database — no stale/cached array can
    // keep a deleted roadmap's sessions visible.
    try {
      await refreshSessions();
    } catch (reloadError) {
      console.error('Session reload failed after roadmap delete (sessions were deleted in Firestore):', reloadError);
      setSessions(prev => prev.filter(s => s.roadmapId !== existing.id));
    }

    toast.success('Roadmap deleted');
  };

  const todayStr = new Date().toISOString().substring(0, 10);
  const currentStreak  = calculateCurrentStreak(sessions);
  const bestStreak     = calculateBestStreak(sessions);
  const completedToday = sessions.some(
    s => s.date.substring(0, 10) === todayStr && (s.completed === true || s.status === 'completed'),
  );

  return (
    <StudyDataContext.Provider
      value={{
        subjects,
        sessions,
        preferences,
        totalStudyHours,
        roadmap,
        roadmapsBySubjectId,
        legacyRoadmaps,
        loading,
        currentStreak,
        bestStreak,
        completedToday,
        addSubject,
        updateSubject,
        deleteSubject,
        addChapter,
        updateChapter,
        addTopic,
        addSubjectTopic,
        updateTopic,
        updateTopicStatus,
        addSession,
        completeSession,
        completeStudySession,
        updateStudySession,
        markSessionMissed,
        markSessionSkipped,
        rescheduleSession,
        moveMissedSessionToCatchUp,
        updatePreferences,
        saveRoadmap,
        updateRoadmapWeek,
        deleteRoadmap,
        refreshData,
        myGoals,
        addGoal,
        toggleGoal,
        removeGoal,
        todayChecklist,
        setTodayChecklistItems,
        toggleChecklistItem,
        lastRoadmapNDSettings,
        saveLastRoadmapNDSettings,
      }}
    >
      {children}
    </StudyDataContext.Provider>
  );
};

export const useStudyData = () => {
  const context = useContext(StudyDataContext);
  if (context === undefined) {
    throw new Error('useStudyData must be used within a StudyDataProvider');
  }
  return context;
};
