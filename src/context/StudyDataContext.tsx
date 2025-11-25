import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudyRoadmap } from '@/services/geminiService';
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
  totalStudyHours: number;
  roadmap: StudyRoadmap | null;
  loading: boolean;
  addSubject: (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'>) => Promise<void>;
  updateSubject: (id: string, subject: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addChapter: (subjectId: string, chapter: Omit<Chapter, 'id' | 'progress'>) => Promise<void>;
  updateChapter: (subjectId: string, chapterId: string, chapter: Partial<Chapter>) => Promise<void>;
  addTopic: (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => Promise<void>;
  updateTopic: (subjectId: string, chapterId: string, topicId: string, topic: Partial<Topic>) => Promise<void>;
  updateTopicStatus: (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => Promise<void>;
  addSession: (session: Omit<StudySession, 'id'>) => Promise<void>;
  completeSession: (sessionId: string) => Promise<void>;
  updatePreferences: (preferences: Partial<StudyPreferences>) => Promise<void>;
  saveRoadmap: (roadmap: StudyRoadmap) => Promise<void>;
  clearRoadmap: () => Promise<void>;
  refreshData: () => Promise<void>;
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
      { start: '16:00', end: '20:00' }
    ],
    breakPreference: 'short',
    studyStyle: 'long',
    topicOrder: 'hard-first'
  });
  const [totalStudyHours, setTotalStudyHours] = useState(0);
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data from Firestore when user is authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setSubjects([]);
        setSessions([]);
        setRoadmap(null);
        setTotalStudyHours(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load subjects
        const userSubjects = await firestoreService.getSubjects(user.id);
        setSubjects(userSubjects);

        // Load study sessions
        const userSessions = await firestoreService.getStudySessions(user.id);
        setSessions(userSessions);

        // Load roadmap
        const latestRoadmap = await firestoreService.getLatestRoadmap(user.id);
        if (latestRoadmap) {
          setRoadmap(latestRoadmap as any);
        }

        // Load preferences and total study hours
        const userPrefs = await firestoreService.getUserPreferences(user.id);
        if (userPrefs && userPrefs.totalStudyHours !== undefined) {
          setTotalStudyHours(userPrefs.totalStudyHours);
        } else {
          // Fallback: Calculate from sessions if no saved total
          const totalHours = userSessions.reduce((sum, s) => sum + s.duration, 0) / 60;
          const roundedHours = Math.round(totalHours);
          setTotalStudyHours(roundedHours);
          
          // Save initial value to Firestore
          if (roundedHours > 0) {
            await firestoreService.saveUserPreferences(user.id, { totalStudyHours: roundedHours });
          }
        }
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
      const userSubjects = await firestoreService.getSubjects(user.id);
      setSubjects(userSubjects);
      
      // Also refresh total study hours
      const userPrefs = await firestoreService.getUserPreferences(user.id);
      if (userPrefs && userPrefs.totalStudyHours !== undefined) {
        setTotalStudyHours(userPrefs.totalStudyHours);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  const addSubject = async (subject: Omit<Subject, 'id' | 'totalTopics' | 'completedTopics' | 'progress'>) => {
    if (!user) return;

    const newSubject: Subject = {
      ...subject,
      id: `subject_${Date.now()}`,
      userId: user.id,
      totalTopics: 0,
      completedTopics: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await firestoreService.saveSubject(user.id, newSubject);
      setSubjects([...subjects, newSubject]);
      toast.success('Subject added successfully');
    } catch (error) {
      console.error('Error adding subject:', error);
      toast.error('Failed to add subject');
    }
  };

  const updateSubject = async (id: string, updatedSubject: Partial<Subject>) => {
    if (!user) return;

    try {
      await firestoreService.updateSubject(id, updatedSubject);
      setSubjects(subjects.map(s => s.id === id ? { ...s, ...updatedSubject } : s));
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
      
      // If no subjects left, clear the roadmap too
      if (updatedSubjects.length === 0 && roadmap) {
        setRoadmap(null);
        // Also delete from Firestore if there's a roadmap ID
        if (roadmap.id) {
          try {
            await firestoreService.deleteRoadmap(roadmap.id);
          } catch (error) {
            console.error('Error deleting roadmap:', error);
          }
        }
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

    const newChapter: Chapter = {
      ...chapter,
      id: `${subjectId}-${Date.now()}`,
      progress: 0
    };

    const updatedSubject = {
      ...subject,
      chapters: [...subject.chapters, newChapter]
    };

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedSubject.chapters });
      setSubjects(subjects.map(s => s.id === subjectId ? updatedSubject : s));
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
      c.id === chapterId ? { ...c, ...updatedChapter } : c
    );

    try {
      await firestoreService.updateSubject(subjectId, { chapters: updatedChapters });
      setSubjects(subjects.map(s => s.id === subjectId ? { ...s, chapters: updatedChapters } : s));
    } catch (error) {
      console.error('Error updating chapter:', error);
      toast.error('Failed to update chapter');
    }
  };

  const addTopic = async (subjectId: string, chapterId: string, topic: Omit<Topic, 'id'>) => {
    if (!user) return;

    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    const newTopic: Topic = {
      ...topic,
      id: `${chapterId}-${Date.now()}`
    };

    const updatedChapters = subject.chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          topics: [...c.topics, newTopic]
        };
      }
      return c;
    });

    // Calculate new progress
    const totalTopics = updatedChapters.reduce((sum, c) => sum + c.topics.length, 0);
    const completedTopics = updatedChapters.reduce((sum, c) => 
      sum + c.topics.filter(t => t.status === 'completed').length, 0
    );
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    try {
      await firestoreService.updateSubject(subjectId, { 
        chapters: updatedChapters, 
        totalTopics,
        completedTopics,
        progress
      });
      setSubjects(subjects.map(s => s.id === subjectId ? { 
        ...s, 
        chapters: updatedChapters,
        totalTopics,
        completedTopics,
        progress
      } : s));
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

    const updatedChapters = subject.chapters.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          topics: c.topics.map(t => t.id === topicId ? { ...t, ...updatedTopic } : t)
        };
      }
      return c;
    });

    // Calculate new progress
    const totalTopics = updatedChapters.reduce((sum, c) => sum + c.topics.length, 0);
    const completedTopics = updatedChapters.reduce((sum, c) => 
      sum + c.topics.filter(t => t.status === 'completed').length, 0
    );
    const progress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    try {
      await firestoreService.updateSubject(subjectId, { 
        chapters: updatedChapters,
        totalTopics,
        completedTopics,
        progress
      });
      setSubjects(subjects.map(s => s.id === subjectId ? { 
        ...s, 
        chapters: updatedChapters,
        totalTopics,
        completedTopics,
        progress
      } : s));
    } catch (error) {
      console.error('Error updating topic:', error);
      toast.error('Failed to update topic');
    }
  };

  const updateTopicStatus = async (subjectId: string, chapterId: string, topicId: string, status: TopicStatus) => {
    if (!user) return;

    // Find the topic to get its time allocation
    const subject = subjects.find(s => s.id === subjectId);
    const chapter = subject?.chapters.find(c => c.id === chapterId);
    const topic = chapter?.topics.find(t => t.id === topicId);
    const previousStatus = topic?.status;

    // Update the topic status
    await updateTopic(subjectId, chapterId, topicId, { status });

    // If topic is being marked as completed (and wasn't completed before), add time to total hours
    if (status === 'completed' && previousStatus !== 'completed' && topic?.timeAllocated) {
      try {
        const timeInMinutes = topic.timeAllocated;
        const newTotalHours = Math.round((totalStudyHours * 60 + timeInMinutes) / 60);
        setTotalStudyHours(newTotalHours);
        
        // Save to Firestore
        await firestoreService.saveUserPreferences(user.id, { totalStudyHours: newTotalHours });
        
        toast.success(`Great! +${timeInMinutes} minutes added to your study hours! 🎉`);
      } catch (error) {
        console.error('Error updating study hours:', error);
      }
    }
  };

  const addSession = async (session: Omit<StudySession, 'id'>) => {
    if (!user) return;

    const newSession: StudySession = {
      ...session,
      id: `session_${Date.now()}`
    };

    try {
      // Find subject to get its name
      const subject = subjects.find(s => s.id === session.subjectId);
      const subjectName = subject?.name || 'Unknown';
      
      await firestoreService.saveStudySession(user.id, {
        subjectId: session.subjectId,
        subjectName,
        topic: '', // You can add topic tracking if needed
        duration: session.duration,
        date: session.date
      });
      
      setSessions([...sessions, newSession]);
      
      // Update total study hours
      const newTotalHours = Math.round((totalStudyHours * 60 + session.duration) / 60);
      setTotalStudyHours(newTotalHours);
      await firestoreService.saveUserPreferences(user.id, { totalStudyHours: newTotalHours });
    } catch (error) {
      console.error('Error adding session:', error);
      toast.error('Failed to save study session');
    }
  };

  const completeSession = async (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, completed: true } : s));
  };

  const updatePreferences = async (newPreferences: Partial<StudyPreferences>) => {
    if (!user) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
      await firestoreService.saveUserPreferences(user.id, {
        dailyGoal: newPreferences.dailyStudyHours,
        weeklyGoal: (newPreferences.dailyStudyHours || 0) * (newPreferences.studyDays?.length || 6)
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  const saveRoadmap = async (newRoadmap: StudyRoadmap) => {
    if (!user) return;

    try {
      await firestoreService.saveRoadmap(user.id, newRoadmap as any);
      setRoadmap(newRoadmap);
      toast.success('Roadmap saved successfully');
    } catch (error) {
      console.error('Error saving roadmap:', error);
      toast.error('Failed to save roadmap');
      throw error;
    }
  };

  const clearRoadmap = async () => {
    if (!user || !roadmap) return;

    try {
      if (roadmap.id) {
        await firestoreService.deleteRoadmap(roadmap.id);
      }
      setRoadmap(null);
      toast.success('Roadmap cleared');
    } catch (error) {
      console.error('Error clearing roadmap:', error);
      toast.error('Failed to clear roadmap');
    }
  };

  return (
    <StudyDataContext.Provider
      value={{
        subjects,
        sessions,
        preferences,
        totalStudyHours,
        roadmap,
        loading,
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
        saveRoadmap,
        clearRoadmap,
        refreshData
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

