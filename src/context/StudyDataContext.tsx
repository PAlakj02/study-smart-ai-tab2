import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudyRoadmap, TimetableBlock, WeekPlan } from '@/services/geminiService';
import { findNextAvailableSlot, SchedulingParams } from '@/services/scheduleUtils';
import { calculateCurrentStreak, calculateBestStreak } from '@/services/streakUtils';
import { useAuth } from './AuthContext';
import * as firestoreService from '@/services/firestoreService';
import { toast } from 'sonner';

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
  createSessionsFromRoadmap: (roadmapId: string, blocks: TimetableBlock[]) => Promise<void>;
  markSessionMissed: (sessionId: string) => Promise<void>;
  markSessionSkipped: (sessionId: string) => Promise<void>;
  rescheduleSession: (sessionId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<StudyPreferences>) => Promise<void>;
  saveRoadmap: (roadmap: StudyRoadmap) => Promise<void>;
  updateRoadmapWeek: (
    subjectId: string,
    weekIndex: number,
    weekUpdates: Partial<Pick<WeekPlan, 'focus' | 'topics' | 'topicIds' | 'goals' | 'notes'>>,
  ) => Promise<void>;
  clearRoadmap: () => Promise<void>;
  refreshData: () => Promise<void>;
  myGoals: firestoreService.GoalItem[];
  addGoal: (text: string) => Promise<void>;
  toggleGoal: (id: string) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  todayChecklist: { date: string; items: firestoreService.ChecklistItem[] } | null;
  setTodayChecklistItems: (date: string, items: firestoreService.ChecklistItem[]) => Promise<void>;
  toggleChecklistItem: (id: string) => Promise<void>;
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
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);
  const [roadmapsBySubjectId, setRoadmapsBySubjectId] = useState<Record<string, StudyRoadmap>>({});
  const [legacyRoadmaps, setLegacyRoadmaps] = useState<StudyRoadmap[]>([]);
  const [myGoals, setMyGoals] = useState<firestoreService.GoalItem[]>([]);
  const [todayChecklist, setTodayChecklist] = useState<{ date: string; items: firestoreService.ChecklistItem[] } | null>(null);
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

  // Load all data from Firestore when user authenticates
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setSubjects([]);
        setSessions([]);
        setRoadmap(null);
        setRoadmapsBySubjectId({});
        setLegacyRoadmaps([]);
        setTotalStudyHours(0);
        setMyGoals([]);
        setTodayChecklist(null);
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
        setSessions(userSessions.map(s => ({
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
        })));

        if (userPrefs?.totalStudyHours !== undefined) {
          setTotalStudyHours(userPrefs.totalStudyHours);
        } else {
          const totalHours = Math.round(userSessions.reduce((sum, s) => sum + s.duration, 0) / 60);
          setTotalStudyHours(totalHours);
          if (totalHours > 0) {
            await firestoreService.saveUserPreferences(user.id, { totalStudyHours: totalHours });
          }
        }

        setMyGoals(userPrefs?.myGoals ?? []);
        setTodayChecklist(userPrefs?.todayChecklist ?? null);
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
      const [userSubjects, userSessions, userPrefs] = await Promise.all([
        firestoreService.getSubjects(user.id),
        firestoreService.getStudySessions(user.id),
        firestoreService.getUserPreferences(user.id),
      ]);
      setSubjects(userSubjects);
      setSessions(userSessions.map(s => ({
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
      })));
      if (userPrefs?.totalStudyHours !== undefined) {
        setTotalStudyHours(userPrefs.totalStudyHours);
      }
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

    if (status === 'completed' && previousStatus !== 'completed' && topic?.timeAllocated) {
      const newTotalHours = Math.round((totalStudyHours * 60 + topic.timeAllocated) / 60);
      setTotalStudyHours(newTotalHours);
      await firestoreService.saveUserPreferences(user.id, { totalStudyHours: newTotalHours });
      toast.success(`Great! +${topic.timeAllocated} minutes added to your study hours! 🎉`);
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

      setSessions(prev => [...prev, newSession]);

      const newTotalHours = Math.round((totalStudyHours * 60 + session.duration) / 60);
      setTotalStudyHours(newTotalHours);
      await firestoreService.saveUserPreferences(user.id, { totalStudyHours: newTotalHours });
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

      // Credit study hours for completing a scheduled session
      if (session.duration && user) {
        const newTotalHours = Math.round((totalStudyHours * 60 + session.duration) / 60);
        setTotalStudyHours(newTotalHours);
        await firestoreService.saveUserPreferences(user.id, { totalStudyHours: newTotalHours });
      }

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

  const createSessionsFromRoadmap = async (roadmapId: string, blocks: TimetableBlock[]) => {
    if (!user || blocks.length === 0) return;
    try {
      await firestoreService.createSessionsFromRoadmap(user.id, roadmapId, blocks);
      // Reload so the dashboard picks up the new sessions immediately
      const updated = await firestoreService.getStudySessions(user.id);
      setSessions(updated.map(s => ({
        id: s.id,
        subjectId: s.subjectId,
        subjectName: s.subjectName,
        topic: s.topic,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        completed: s.completed ?? false,
        status: (s.status as SessionStatus) ?? 'scheduled',
        roadmapId: s.roadmapId,
      })));
    } catch (error) {
      console.error('Error creating sessions from roadmap:', error);
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

    // Persist session blocks (idempotent — skips if already seeded)
    if (suggestedSessions && suggestedSessions.length > 0) {
      try {
        await firestoreService.createSessionsFromRoadmap(user.id, roadmapId, suggestedSessions);
      } catch (sessionError) {
        console.error('Sessions save failed (roadmap saved OK):', sessionError);
      }
      // Reload sessions regardless so UI reflects whatever was saved
      try {
        const updated = await firestoreService.getStudySessions(user.id);
        setSessions(updated.map(s => ({
          id: s.id,
          subjectId: s.subjectId,
          subjectName: s.subjectName,
          topic: s.topic,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          duration: s.duration,
          completed: s.completed ?? false,
          status: (s.status as SessionStatus) ?? 'scheduled',
          roadmapId: s.roadmapId,
        })));
      } catch (reloadError) {
        console.error('Session reload failed:', reloadError);
      }
    }
    // Caller is responsible for showing the success toast
  };

  // ── Edit a single week of an already-saved roadmap (focus, topics, goals,
  //    notes) — reuses the existing roadmap doc + updateRoadmap, no new
  //    collection. Updates local state first so the UI (this panel, the week
  //    timeline, "This Week" progress) reflects the change immediately;
  //    already-generated calendar sessions for that week are NOT rewritten,
  //    since that would mean deleting/recreating session docs and their
  //    completion history rather than editing a field. ─────────────────────
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
      toast.success('Week updated');
    } catch (error) {
      console.error('Error updating week:', error);
      toast.error('Failed to save week — reverting');
      setRoadmapsBySubjectId(prev => ({ ...prev, [subjectId]: existing }));
      if (roadmap?.id === existing.id) setRoadmap(existing);
    }
  };

  const clearRoadmap = async () => {
    if (!user || !roadmap) return;
    try {
      if (roadmap.id) await firestoreService.deleteRoadmap(roadmap.id);
      setRoadmap(null);
      toast.success('Roadmap cleared');
    } catch (error) {
      console.error('Error clearing roadmap:', error);
      toast.error('Failed to clear roadmap');
    }
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
        createSessionsFromRoadmap,
        markSessionMissed,
        markSessionSkipped,
        rescheduleSession,
        updatePreferences,
        saveRoadmap,
        updateRoadmapWeek,
        clearRoadmap,
        refreshData,
        myGoals,
        addGoal,
        toggleGoal,
        removeGoal,
        todayChecklist,
        setTodayChecklistItems,
        toggleChecklistItem,
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
