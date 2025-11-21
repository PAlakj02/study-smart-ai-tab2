import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudyRoadmap } from '@/services/geminiService';

export type TopicStatus = 'pending' | 'in-progress' | 'completed' | 'revising';
export type ChapterDifficulty = 'easy' | 'medium' | 'hard';
export type ChapterLength = 'short' | 'medium' | 'long';

export interface Topic {
  id: string;
  name: string;
  status: TopicStatus;
  timeAllocated: number; // in minutes
  timeSpent: number; // in minutes
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

export interface StudySession {
  id: string;
  subjectId: string;
  topicId: string;
  date: string;
  startTime: string;
  duration: number; // in minutes
  completed: boolean;
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
  streak: number;
  totalStudyHours: number;
  roadmap: StudyRoadmap | null;
  addSubject: (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'>) => void;
  updateSubject: (id: string, subject: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addChapter: (subjectId: string, chapter: Omit<Chapter, 'id' | 'progress'>) => void;
  updateChapter: (subjectId: string, chapterId: string, chapter: Partial<Chapter>) => void;
  addTopic: (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => void;
  updateTopic: (subjectId: string, chapterId: string, topicId: string, topic: Partial<Topic>) => void;
  updateTopicStatus: (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => void;
  addSession: (session: Omit<StudySession, 'id'>) => void;
  completeSession: (sessionId: string) => void;
  updatePreferences: (preferences: Partial<StudyPreferences>) => void;
  setRoadmap: (roadmap: StudyRoadmap) => void;
}

const StudyDataContext = createContext<StudyDataContextType | undefined>(undefined);

// Dummy initial data
const INITIAL_SUBJECTS: Subject[] = [
  {
    id: '1',
    name: 'Mathematics',
    color: 'bg-blue-500',
    examDate: '2024-12-15',
    priority: 5,
    chapters: [
      {
        id: '1-1',
        name: 'Calculus',
        difficulty: 'hard',
        length: 'long',
        progress: 65,
        topics: [
          { id: '1-1-1', name: 'Limits and Continuity', status: 'completed', timeAllocated: 120, timeSpent: 110, notes: 'Focus on epsilon-delta definition' },
          { id: '1-1-2', name: 'Derivatives', status: 'in-progress', timeAllocated: 150, timeSpent: 75 },
          { id: '1-1-3', name: 'Integration', status: 'pending', timeAllocated: 180, timeSpent: 0 },
          { id: '1-1-4', name: 'Applications', status: 'pending', timeAllocated: 120, timeSpent: 0 }
        ]
      },
      {
        id: '1-2',
        name: 'Algebra',
        difficulty: 'medium',
        length: 'medium',
        progress: 80,
        topics: [
          { id: '1-2-1', name: 'Quadratic Equations', status: 'completed', timeAllocated: 90, timeSpent: 85 },
          { id: '1-2-2', name: 'Polynomials', status: 'completed', timeAllocated: 100, timeSpent: 95 },
          { id: '1-2-3', name: 'Complex Numbers', status: 'revising', timeAllocated: 80, timeSpent: 60 }
        ]
      }
    ],
    totalTopics: 7,
    completedTopics: 3,
    progress: 70
  },
  {
    id: '2',
    name: 'Physics',
    color: 'bg-purple-500',
    examDate: '2024-12-18',
    priority: 4,
    chapters: [
      {
        id: '2-1',
        name: 'Mechanics',
        difficulty: 'medium',
        length: 'long',
        progress: 55,
        topics: [
          { id: '2-1-1', name: 'Kinematics', status: 'completed', timeAllocated: 120, timeSpent: 120 },
          { id: '2-1-2', name: 'Laws of Motion', status: 'in-progress', timeAllocated: 150, timeSpent: 80 },
          { id: '2-1-3', name: 'Work and Energy', status: 'pending', timeAllocated: 130, timeSpent: 0 }
        ]
      }
    ],
    totalTopics: 3,
    completedTopics: 1,
    progress: 55
  },
  {
    id: '3',
    name: 'Chemistry',
    color: 'bg-green-500',
    examDate: '2024-12-20',
    priority: 3,
    chapters: [
      {
        id: '3-1',
        name: 'Organic Chemistry',
        difficulty: 'hard',
        length: 'long',
        progress: 40,
        topics: [
          { id: '3-1-1', name: 'Hydrocarbons', status: 'completed', timeAllocated: 140, timeSpent: 135 },
          { id: '3-1-2', name: 'Functional Groups', status: 'in-progress', timeAllocated: 160, timeSpent: 60 },
          { id: '3-1-3', name: 'Reactions', status: 'pending', timeAllocated: 180, timeSpent: 0 }
        ]
      }
    ],
    totalTopics: 3,
    completedTopics: 1,
    progress: 40
  }
];

export const StudyDataProvider = ({ children }: { children: ReactNode }) => {
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [preferences, setPreferences] = useState<StudyPreferences>({
    dailyStudyHours: 6,
    studyDays: [1, 2, 3, 4, 5, 6],
    productiveHours: [
      { start: '06:00', end: '09:00' },
      { start: '16:00', end: '20:00' }
    ],
    breakPreference: 'short',
    studyStyle: 'long',
    topicOrder: 'hard-first'
  });
  const [streak, setStreak] = useState(7);
  const [totalStudyHours, setTotalStudyHours] = useState(142);
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);

  // Load roadmap from localStorage on mount
  useEffect(() => {
    const savedRoadmap = localStorage.getItem('studyRoadmap');
    if (savedRoadmap) {
      setRoadmap(JSON.parse(savedRoadmap));
    }
  }, []);

  // Save roadmap to localStorage whenever it changes
  useEffect(() => {
    if (roadmap) {
      localStorage.setItem('studyRoadmap', JSON.stringify(roadmap));
    }
  }, [roadmap]);

  const addSubject = (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'>) => {
    const newSubject: Subject = {
      ...subject,
      id: Date.now().toString(),
      totalTopics: 0,
      completedTopics: 0,
      progress: 0
    };
    setSubjects([...subjects, newSubject]);
  };

  const updateSubject = (id: string, updatedSubject: Partial<Subject>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, ...updatedSubject } : s));
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const addChapter = (subjectId: string, chapter: Omit<Chapter, 'id' | 'progress'>) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        const newChapter: Chapter = {
          ...chapter,
          id: `${subjectId}-${Date.now()}`,
          progress: 0
        };
        return {
          ...s,
          chapters: [...s.chapters, newChapter]
        };
      }
      return s;
    }));
  };

  const updateChapter = (subjectId: string, chapterId: string, updatedChapter: Partial<Chapter>) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: s.chapters.map(c => c.id === chapterId ? { ...c, ...updatedChapter } : c)
        };
      }
      return s;
    }));
  };

  const addTopic = (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: s.chapters.map(c => {
            if (c.id === chapterId) {
              const newTopic: Topic = {
                ...topic,
                id: `${chapterId}-${Date.now()}`
              };
              return {
                ...c,
                topics: [...c.topics, newTopic]
              };
            }
            return c;
          })
        };
      }
      return s;
    }));
  };

  const updateTopic = (subjectId: string, chapterId: string, topicId: string, updatedTopic: Partial<Topic>) => {
    setSubjects(subjects.map(s => {
      if (s.id === subjectId) {
        return {
          ...s,
          chapters: s.chapters.map(c => {
            if (c.id === chapterId) {
              return {
                ...c,
                topics: c.topics.map(t => t.id === topicId ? { ...t, ...updatedTopic } : t)
              };
            }
            return c;
          })
        };
      }
      return s;
    }));
  };

  const updateTopicStatus = (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => {
    updateTopic(subjectId, chapterId, topicId, { status });
  };

  const addSession = (session: Omit<StudySession, 'id'>) => {
    const newSession: StudySession = {
      ...session,
      id: Date.now().toString()
    };
    setSessions([...sessions, newSession]);
  };

  const completeSession = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, completed: true } : s));
  };

  const updatePreferences = (newPreferences: Partial<StudyPreferences>) => {
    setPreferences({ ...preferences, ...newPreferences });
  };

  return (
    <StudyDataContext.Provider
      value={{
        subjects,
        sessions,
        preferences,
        streak,
        totalStudyHours,
        roadmap,
        addSubject,
        updateSubject,
        deleteSubject,
        addChapter,
        updateChapter,
        addTopic,
        updateTopic,
        updateTopicStatus,
        addSession,
        completeSession,
        updatePreferences,
        setRoadmap
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

