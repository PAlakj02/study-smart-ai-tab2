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
  Timestamp 
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
  title: string;
  description: string;
  subjects: string[];
  examDate: string;
  studyHoursPerDay: number;
  weakAreas: string;
  studyStyle: string;
  goals: string;
  totalWeeks: number;
  weeklyPlans: WeeklyPlan[];
  tips: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPlan {
  week: number;
  focus: string;
  topics: string[];
  goals: string[];
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  duration: number;
  date: string;
  createdAt: string;
}

// Subjects
export const saveSubject = async (userId: string, subject: Omit<Subject, 'userId' | 'createdAt' | 'updatedAt'>) => {
  const subjectRef = doc(db, 'subjects', subject.id);
  await setDoc(subjectRef, {
    ...subject,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return subject.id;
};

export const updateSubject = async (subjectId: string, updates: Partial<Subject>) => {
  const subjectRef = doc(db, 'subjects', subjectId);
  await updateDoc(subjectRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
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
  
  await setDoc(roadmapRef, {
    ...roadmap,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  return roadmapId;
};

export const updateRoadmap = async (roadmapId: string, updates: Partial<Roadmap>) => {
  const roadmapRef = doc(db, 'roadmaps', roadmapId);
  await updateDoc(roadmapRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteRoadmap = async (roadmapId: string) => {
  const roadmapRef = doc(db, 'roadmaps', roadmapId);
  await deleteDoc(roadmapRef);
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

export const getLatestRoadmap = async (userId: string): Promise<Roadmap | null> => {
  const roadmaps = await getRoadmaps(userId);
  if (roadmaps.length === 0) return null;
  
  // Sort by createdAt and return the latest
  return roadmaps.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
};

// Study Sessions
export const saveStudySession = async (userId: string, session: Omit<StudySession, 'id' | 'userId' | 'createdAt'>) => {
  const sessionId = `session_${Date.now()}`;
  const sessionRef = doc(db, 'studySessions', sessionId);
  
  await setDoc(sessionRef, {
    ...session,
    userId,
    createdAt: serverTimestamp()
  });
  
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

// User Preferences
export interface UserPreferences {
  userId: string;
  totalStudyHours: number;
  weeklyGoal: number;
  dailyGoal: number;
  updatedAt: string;
}

export const saveUserPreferences = async (userId: string, preferences: Partial<UserPreferences>) => {
  const prefsRef = doc(db, 'userPreferences', userId);
  await setDoc(prefsRef, {
    ...preferences,
    userId,
    updatedAt: serverTimestamp()
  }, { merge: true });
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

