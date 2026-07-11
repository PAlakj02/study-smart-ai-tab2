import React from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudyData } from "@/context/StudyDataContext";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  Settings,
  Target,
  Play,
  LogOut,
  Plus,
  BarChart3,
  BookMarked,
  Sparkles,
  Timer,
  ChevronDown,
  CalendarDays,
  CalendarClock,
  Hourglass,
  ListChecks,
  Lightbulb,
  ClipboardList,
  X,
  Pencil,
  StickyNote,
  Trash2,
} from "lucide-react";

// Focus tips shown before a study block when "Low distraction" is on — a
// small rotating pool so the same two tips don't repeat for every session.
const LOW_DISTRACTION_TIPS = [
  'Silence notifications before you start.',
  'Keep only the materials you need on your desk.',
  'Use full-screen mode to avoid tab-switching.',
  'Keep water nearby so you don’t need to get up.',
  'Put your phone in another room.',
  'Close any tabs unrelated to this session.',
];

/** Deterministic-per-seed pick of 2 tips — same seed (e.g. a session group's
 *  key) always shows the same pair, but different groups/days rotate through
 *  the pool instead of always showing tips[0] and tips[1]. */
const focusTipsFor = (seed: string, count = 2): string[] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const start = hash % LOW_DISTRACTION_TIPS.length;
  return Array.from({ length: count }, (_, i) => LOW_DISTRACTION_TIPS[(start + i) % LOW_DISTRACTION_TIPS.length]);
};

// "16:00" → "4:00 PM"
const fmt12h = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
};

// Local calendar date, NOT toISOString() — that converts to UTC first, which
// silently shows "yesterday" for part of the day in positive-UTC-offset
// timezones (e.g. IST) and "tomorrow" in negative ones. Matches the same safe
// pattern already used by StudyCalendar.tsx's toDateStr().
const todayDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    subjects, sessions, totalStudyHours, roadmap, roadmapsBySubjectId, loading,
    completeStudySession, markSessionMissed, rescheduleSession, moveMissedSessionToCatchUp, currentStreak, bestStreak,
    myGoals, addGoal, toggleGoal, removeGoal,
    todayChecklist: persistedChecklist, setTodayChecklistItems, toggleChecklistItem,
    updateRoadmapWeek, deleteRoadmap,
  } = useStudyData();
  const [searchParams] = useSearchParams();
  const focusSubjectId = searchParams.get('subjectId');
  const focusDate = searchParams.get('date');

  // ── AI Roadmap panel: one subject at a time, switchable ───────────────────
  const [selectedPanelSubjectId, setSelectedPanelSubjectId] = React.useState<string | null>(null);
  const [showFullPlan, setShowFullPlan] = React.useState(false);

  // ── Edit Week dialog — lets a user personalize an already-generated week ──
  const [editWeekIndex, setEditWeekIndex] = React.useState<number | null>(null);
  const [editFocus, setEditFocus] = React.useState('');
  const [editTopics, setEditTopics] = React.useState<{ name: string; topicId?: string }[]>([]);
  const [editGoalsList, setEditGoalsList] = React.useState<string[]>([]);
  const [editWeekNotes, setEditWeekNotes] = React.useState('');
  const [newEditTopicText, setNewEditTopicText] = React.useState('');
  const [newEditGoalText, setNewEditGoalText] = React.useState('');

  const openEditWeek = (weekIndex: number) => {
    const week = panelRoadmap?.weeklyPlans[weekIndex];
    if (!week) return;
    setEditWeekIndex(weekIndex);
    setEditFocus(week.focus);
    setEditTopics(week.topics.map((name, i) => ({ name, topicId: week.topicIds?.[i] })));
    setEditGoalsList([...week.goals]);
    setEditWeekNotes(week.notes ?? '');
    setNewEditTopicText('');
    setNewEditGoalText('');
  };

  const handleSaveWeekEdit = async () => {
    if (editWeekIndex === null || !panelSubject) return;
    await updateRoadmapWeek(panelSubject.id, editWeekIndex, {
      focus: editFocus.trim() || panelRoadmap?.weeklyPlans[editWeekIndex]?.focus,
      topics: editTopics.map(t => t.name),
      topicIds: editTopics.map(t => t.topicId),
      goals: editGoalsList,
      notes: editWeekNotes.trim() || undefined,
    });
    setEditWeekIndex(null);
  };

  // Deep link (e.g. from Calendar's "View in Dashboard") always wins
  React.useEffect(() => {
    if (focusSubjectId && subjects.some(s => s.id === focusSubjectId)) {
      setSelectedPanelSubjectId(focusSubjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSubjectId, subjects.length]);

  // Otherwise default to the first subject that has a roadmap, else the first subject
  React.useEffect(() => {
    setSelectedPanelSubjectId(prev => {
      if (prev && subjects.some(s => s.id === prev)) return prev;
      return subjects.find(s => roadmapsBySubjectId[s.id])?.id ?? subjects[0]?.id ?? null;
    });
  }, [subjects, roadmapsBySubjectId]);

  const panelSubject = subjects.find(s => s.id === selectedPanelSubjectId) ?? null;
  const panelRoadmap = panelSubject ? roadmapsBySubjectId[panelSubject.id] : undefined;
  const panelTopics = panelSubject ? panelSubject.chapters.flatMap(c => c.topics) : [];
  const panelDayFocusSessions = panelSubject && focusDate
    ? sessions.filter(s => s.subjectId === panelSubject.id && s.date.substring(0, 10) === focusDate)
    : [];
  // Prefer the roadmap's own recorded exam date (fixed at generation time);
  // fall back to the subject's exam date only for legacy roadmaps saved
  // before this field existed. startDate/endDate/examDate are three fully
  // independent user-selected fields — never derive one from another.
  const panelExamDate = panelRoadmap?.examDate ?? panelSubject?.examDate;
  const panelDaysLeft = panelExamDate
    ? Math.ceil((new Date(panelExamDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const panelCurrentWeekIndex = panelRoadmap
    ? Math.min(
        Math.max(0, Math.floor((Date.now() - new Date(panelRoadmap.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))),
        panelRoadmap.weeklyPlans.length - 1,
      )
    : 0;
  const panelRemainingHours = panelRoadmap
    ? panelRoadmap.weeklyPlans.slice(panelCurrentWeekIndex).reduce((sum, w) => sum + w.studyHours, 0)
    : 0;

  // ── Real scheduled sessions for today (from roadmap timetable) ────────────
  const todayStr = todayDateStr();
  const realTodaySessions = React.useMemo(
    () =>
      sessions
        .filter(s => s.date.substring(0, 10) === todayStr && s.roadmapId)
        .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [sessions, todayStr],
  );

  // ── Group today's sessions by subject+topic into one focus card per group,
  //    instead of one card per 60-min session block ─────────────────────────
  const todayFocusGroups = React.useMemo(() => {
    const map = new Map<string, {
      key: string;
      subjectId: string;
      subjectName: string;
      topic: string;
      color: string;
      groupSessions: typeof realTodaySessions;
      totalMinutes: number;
    }>();
    for (const s of realTodaySessions) {
      const key = `${s.subjectId}::${s.topic ?? ''}`;
      if (!map.has(key)) {
        const subj = subjects.find(sub => sub.id === s.subjectId);
        map.set(key, {
          key,
          subjectId: s.subjectId,
          subjectName: s.subjectName ?? subj?.name ?? 'Study',
          topic: s.topic ?? 'Study session',
          color: subj?.color ?? 'bg-primary',
          groupSessions: [],
          totalMinutes: 0,
        });
      }
      const g = map.get(key)!;
      g.groupSessions.push(s);
      g.totalMinutes += s.duration;
    }
    return Array.from(map.values());
  }, [realTodaySessions, subjects]);

  const [expandedFocusGroups, setExpandedFocusGroups] = React.useState<Record<string, boolean>>({});

  // ── AI-generated Today's Checklist — canned study activities for today's
  //    real topics. Falls back to EVERY subject's current-week topics (not
  //    just whichever one happens to be selected in the AI Roadmap panel
  //    dropdown) on rest days with no sessions scheduled, so "today's tasks"
  //    genuinely reflects the whole day, not one arbitrary subject.
  //    Persisted per-day in context: pre-filled once when the day starts,
  //    checked state survives refresh, and a fresh list replaces it the next
  //    study day (see the sync effect below). ────────────────────────────────
  const computedChecklistItems = React.useMemo(() => {
    let topics: string[];
    if (todayFocusGroups.length > 0) {
      topics = todayFocusGroups.map(g => g.topic);
    } else {
      topics = Object.values(roadmapsBySubjectId).flatMap(rm => {
        const weekIndex = Math.min(
          Math.max(0, Math.floor((Date.now() - new Date(rm.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))),
          rm.weeklyPlans.length - 1,
        );
        return rm.weeklyPlans[weekIndex]?.topics ?? [];
      });
    }
    const activityTemplates = (t: string) => [
      `Read notes on ${t}`,
      `Watch a lecture/tutorial on ${t}`,
      `Solve practice questions on ${t}`,
    ];
    return topics.slice(0, 2).flatMap(activityTemplates).map((text, i) => ({ id: `check-${i}`, text, completed: false }));
  }, [todayFocusGroups, roadmapsBySubjectId]);

  // Pre-fill/replace the persisted checklist exactly once when the stored
  // date no longer matches today — i.e. at the start of a new study day.
  React.useEffect(() => {
    if (loading) return;
    if (persistedChecklist?.date === todayStr) return;
    setTodayChecklistItems(todayStr, computedChecklistItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, persistedChecklist?.date, todayStr]);

  const todayChecklist = persistedChecklist?.date === todayStr ? persistedChecklist.items : [];

  // ── My Goals — persistent personal checklist ───────────────────────────────
  const [newGoalText, setNewGoalText] = React.useState('');

  // ── This Week progress — compact, per subject with a roadmap ───────────────
  const thisWeekBySubject = React.useMemo(() => {
    return subjects
      .map(subject => {
        const rm = roadmapsBySubjectId[subject.id];
        if (!rm) return null;
        const weekIdx = Math.min(
          Math.max(0, Math.floor((Date.now() - new Date(rm.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000))),
          rm.weeklyPlans.length - 1,
        );
        const week = rm.weeklyPlans[weekIdx];
        if (!week) return null;
        const subjectTopics = subject.chapters.flatMap(c => c.topics);
        // Prefer matching by stable topicId; only fall back to name matching
        // when an id wasn't resolvable (e.g. roadmaps saved before this field existed).
        const doneCount = week.topics.filter((t, i) => {
          const topicId = week.topicIds?.[i];
          const matched = topicId
            ? subjectTopics.find(st => st.id === topicId)
            : subjectTopics.find(st => st.name === t);
          return matched?.status === 'completed';
        }).length;
        return { subjectId: subject.id, subjectName: subject.name, color: subject.color, week, weekIdx, doneCount };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [subjects, roadmapsBySubjectId]);

  // ── AI Tip / Daily Motivation — reuses roadmap tips already generated ──────
  const FALLBACK_TIPS = [
    'Small consistent sessions beat rare marathon ones — show up today.',
    'Active recall beats re-reading — quiz yourself before checking notes.',
    'Take a real break every session — your brain consolidates learning during rest.',
  ];
  const dailyTip = React.useMemo(() => {
    const pool = panelRoadmap?.tips?.length ? panelRoadmap.tips : FALLBACK_TIPS;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    return pool[dayOfYear % pool.length];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelRoadmap]);

  // ── Derived sessions (fallback) when no roadmap timetable sessions today ──
  const derivedSessions = React.useMemo(() => {
    if (realTodaySessions.length > 0) return [];

    const sessionList: {
      id: string;
      subject: string;
      topic: string;
      time: string;
      duration: number;
      status: string;
      color: string;
    }[] = [];

    if (roadmap?.weeklyPlans) {
      const weekIdx = Math.min(
        Math.floor((Date.now() - new Date(roadmap.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        roadmap.weeklyPlans.length - 1,
      );
      const week = roadmap.weeklyPlans[weekIdx];
      const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
      if (week?.topics) {
        week.topics.slice(0, 4).forEach((topic, i) => {
          const subj = subjects.find(s => week.focus.toLowerCase().includes(s.name.toLowerCase())) ?? subjects[0];
          sessionList.push({
            id: `derived-${i}`,
            subject: subj?.name ?? 'Study',
            topic,
            time: times[i],
            duration: 60,
            status: i === 0 ? 'current' : 'upcoming',
            color: subj?.color ?? 'bg-primary',
          });
        });
      }
    }

    if (sessionList.length === 0) {
      const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
      let count = 0;
      for (const subject of subjects) {
        if (count >= 4) break;
        for (const chapter of subject.chapters) {
          if (count >= 4) break;
          for (const topic of chapter.topics.filter(t => t.status === 'pending' || t.status === 'in-progress').slice(0, 1)) {
            sessionList.push({
              id: `derived-${count}`,
              subject: subject.name,
              topic: `${chapter.name}: ${topic.name}`,
              time: times[count],
              duration: topic.timeAllocated ?? 60,
              status: count === 0 ? 'current' : 'upcoming',
              color: subject.color,
            });
            count++;
          }
        }
      }
    }

    return sessionList;
  }, [realTodaySessions.length, subjects, roadmap]);

  const upcomingExams = subjects
    .filter(s => s.examDate)
    .map(s => ({
      subject: s.name,
      date: new Date(s.examDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysLeft: Math.ceil((new Date(s.examDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      status: s.progress >= 60 ? 'on-track' : 'needs-attention',
      color: s.color,
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const overallProgress =
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
      : 0;

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Count today's completions
  const completedToday = realTodaySessions.filter(s => s.completed).length;
  const totalToday = realTodaySessions.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gradient">StudySync</h1>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/roadmap')}>AI Roadmap</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>Calendar</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/motivation')}>Motivation</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/parent')}>Parent View</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tutorial')}>Tutorial</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>My Subjects</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>Analytics</Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/study-session')} title="Pomodoro Timer">
                <Timer className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
              <MobileNavMenu
                items={[
                  { label: 'Dashboard', path: '/dashboard' },
                  { label: 'AI Roadmap', path: '/roadmap' },
                  { label: 'Calendar', path: '/calendar' },
                  { label: 'Motivation', path: '/motivation' },
                  { label: 'Parent View', path: '/parent' },
                  { label: 'Tutorial', path: '/tutorial' },
                  { label: 'My Subjects', path: '/subjects' },
                  { label: 'Analytics', path: '/analytics' },
                ]}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading your dashboard...</h3>
          </Card>
        ) : (
          <>
            {/* Welcome */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                  <h2 className="text-3xl font-bold">Good Morning, {user?.name ?? 'Student'}! 👋</h2>
                  <p className="text-muted-foreground">Let's make today productive!</p>
                </div>
                <Button onClick={() => navigate('/subjects')} className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topics
                </Button>
              </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { icon: <Clock className="h-5 w-5 text-primary" />, bg: 'bg-primary/20', value: `${totalStudyHours}h`, label: 'Total Hours', delay: 0.1 },
                { icon: <BookOpen className="h-5 w-5 text-success" />, bg: 'bg-success/20', value: subjects.length, label: 'Subjects', delay: 0.2 },
                { icon: <Target className="h-5 w-5 text-info" />, bg: 'bg-info/20', value: subjects.reduce((a, s) => a + s.completedTopics, 0), label: 'Topics Done', delay: 0.3 },
                { icon: <TrendingUp className="h-5 w-5 text-warning" />, bg: 'bg-warning/20', value: `${overallProgress}%`, label: 'Progress', delay: 0.4 },
                { icon: <span className="text-lg leading-none">🔥</span>, bg: 'bg-orange-100', value: `${currentStreak}d`, label: `Streak · best ${bestStreak}d`, delay: 0.5 },
              ].map(({ icon, bg, value, label, delay }) => (
                <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
                      <div>
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* First-time onboarding banner — shown until the user has at least one subject */}
            {subjects.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <Card className="p-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Generate Your AI Study Roadmap</h3>
                    <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                      Let our AI create a personalised week-by-week study plan with daily scheduled sessions.
                    </p>
                    <Button onClick={() => navigate('/roadmap')} className="gradient-primary text-white">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Roadmap Now
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Balanced two-column planner layout: sticky AI Roadmap panel (~65%) + Today's Study Plan (~35%) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">

            {/* AI Roadmap — sticky, single-subject, planner-focused panel */}
            {subjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 lg:sticky lg:top-24"
              >
                <Card
                  className={`p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 ${
                    focusSubjectId === panelSubject?.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">AI Roadmap</h3>
                    </div>
                    {panelRoadmap && panelSubject && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this roadmap?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently deletes the AI roadmap for <strong>{panelSubject.name}</strong> and
                              every study session generated from it. Your subject, its syllabus/topics, and topic
                              descriptions are kept, so you can generate a fresh roadmap for {panelSubject.name} right
                              after. This can't be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteRoadmap(panelSubject.id)}
                            >
                              Delete Roadmap
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {panelRoadmap?.neurodivergentOptions?.lowDistractionMode && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground border border-secondary/20 mb-2">
                      🔕 Low-distraction mode — phone away, one tab open
                    </span>
                  )}

                  {/* Subject switcher */}
                  <select
                    className="w-full mt-2 mb-3 px-2 py-1.5 text-sm bg-background border border-input rounded-md"
                    value={panelSubject?.id ?? ''}
                    onChange={e => setSelectedPanelSubjectId(e.target.value)}
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  {panelSubject && (
                    <>
                      {/* Progress — always visible */}
                      <div className="flex items-center gap-2 mb-4">
                        <Progress value={panelSubject.progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {panelSubject.completedTopics}/{panelSubject.totalTopics} topics · {panelSubject.progress}%
                        </span>
                      </div>

                      {panelTopics.length === 0 ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Add topics for {panelSubject.name} before generating a roadmap.
                          </p>
                          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/subjects')}>
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add topics
                          </Button>
                        </div>
                      ) : !panelRoadmap ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">No AI roadmap yet for {panelSubject.name}</p>
                          <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/roadmap?subjectId=${panelSubject.id}`)}>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Generate roadmap
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">{panelRoadmap.description}</p>

                          {/* Dates + duration */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3 text-center mb-4">
                            <div className="p-2.5 bg-background/50 rounded-lg">
                              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><CalendarDays className="h-3 w-3" />Start</div>
                              <div className="text-sm font-semibold mt-0.5">{panelRoadmap.startDate}</div>
                            </div>
                            <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                              <div className="text-[10px] text-destructive flex items-center justify-center gap-1"><CalendarClock className="h-3 w-3" />Exam</div>
                              <div className="text-sm font-semibold text-destructive mt-0.5">{panelExamDate ?? '—'}</div>
                            </div>
                            <div className="p-2.5 bg-background/50 rounded-lg">
                              <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Calendar className="h-3 w-3" />End</div>
                              <div className="text-sm font-semibold mt-0.5">{panelRoadmap.endDate}</div>
                            </div>
                            <div className="p-2.5 bg-background/50 rounded-lg">
                              <div className="text-[10px] text-muted-foreground">Duration</div>
                              <div className="text-sm font-semibold mt-0.5">{panelRoadmap.totalWeeks}w</div>
                            </div>
                          </div>

                          {/* Countdown */}
                          {panelDaysLeft !== null && (
                            <div className={`mb-4 p-2.5 rounded-lg text-center text-sm font-semibold ${
                              panelDaysLeft < 7 ? 'bg-destructive/10 text-destructive'
                                : panelDaysLeft < 14 ? 'bg-warning/10 text-warning'
                                : 'bg-primary/10 text-primary'
                            }`}>
                              {panelDaysLeft >= 0 ? `${panelDaysLeft} days left` : 'Exam date passed'}
                            </div>
                          )}

                          {panelDayFocusSessions.length > 0 && (
                            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                              <p className="text-xs font-medium mb-1">
                                Focus for {new Date(focusDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                              <ul className="space-y-0.5">
                                {panelDayFocusSessions.map(s => (
                                  <li key={s.id} className="text-xs text-muted-foreground">• {s.topic}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Week timeline */}
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Week Timeline</p>
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                            {panelRoadmap.weeklyPlans.map((week, i) => (
                              <div
                                key={i}
                                title={`Week ${week.week}: ${week.focus}`}
                                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
                                  i === panelCurrentWeekIndex
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : i < panelCurrentWeekIndex
                                    ? 'bg-success/10 text-success border-success/30'
                                    : 'bg-muted text-muted-foreground border-border'
                                }`}
                              >
                                {week.week}
                              </div>
                            ))}
                          </div>

                          {/* Remaining hours */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                            <Hourglass className="h-4 w-4" />
                            <span><strong className="text-foreground">{panelRemainingHours}h</strong> remaining in this roadmap</span>
                          </div>

                          <Collapsible open={showFullPlan} onOpenChange={setShowFullPlan}>
                            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                              {showFullPlan ? 'Hide full plan' : 'Show full plan'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${showFullPlan ? 'rotate-180' : ''}`} />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-3 space-y-4">
                              {/* Full week-by-week roadmap */}
                              <div>
                                <p className="text-xs font-semibold mb-1.5">Full Roadmap</p>
                                <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                                  {panelRoadmap.weeklyPlans.map((week, i) => (
                                    <div key={i} className="p-3 bg-background rounded-lg">
                                      <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <p className="text-xs font-medium text-primary">
                                          Week {week.week}: {week.focus}
                                        </p>
                                        <button
                                          className="flex-shrink-0 text-muted-foreground hover:text-primary p-0.5"
                                          onClick={() => openEditWeek(i)}
                                          aria-label={`Edit week ${week.week}`}
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      <div className="space-y-0.5">
                                        {week.topics.map((t, ti) => (
                                          <div key={ti} className="flex items-center gap-1.5 text-xs">
                                            <Target className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                            <span>{t}</span>
                                          </div>
                                        ))}
                                      </div>
                                      {week.goals.length > 0 && (
                                        <div className="mt-1.5 pt-1.5 border-t border-border/50 space-y-0.5">
                                          {week.goals.map((g, gi) => (
                                            <div key={gi} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                              <ListChecks className="h-3 w-3 flex-shrink-0" />
                                              <span>{g}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {week.notes && (
                                        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                          <StickyNote className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                          <span className="italic">{week.notes}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Topics with their descriptions and current status */}
                              {panelTopics.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold mb-1.5">Topics</p>
                                  <div className="grid sm:grid-cols-2 gap-1.5">
                                    {panelTopics.map(t => (
                                      <div key={t.id} className="p-2 bg-background rounded-lg">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className={`text-xs font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                            {t.name}
                                          </span>
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                            t.status === 'completed' ? 'bg-success/10 text-success'
                                              : t.status === 'in-progress' ? 'bg-primary/10 text-primary'
                                              : t.status === 'revising' ? 'bg-warning/10 text-warning'
                                              : 'bg-muted text-muted-foreground'
                                          }`}>
                                            {t.status}
                                          </span>
                                        </div>
                                        {t.notes && (
                                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.notes}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                    </>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Right column: Today's Focus + Checklist + Goals + This Week + AI Tip */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1 space-y-6">
              <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Today's Study Plan</h3>
                    </div>
                    {totalToday > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {completedToday}/{totalToday} done
                      </span>
                    )}
                  </div>

                  {/* Progress bar when there are real sessions */}
                  {totalToday > 0 && (
                    <div className="mb-5">
                      <Progress value={(completedToday / totalToday) * 100} className="h-2" />
                    </div>
                  )}

                  {/* Today's Focus — one grouped card per subject+topic, not one per session */}
                  {todayFocusGroups.length > 0 ? (
                    <div className="space-y-3">
                      {todayFocusGroups.map((group, index) => {
                        const groupCompleted = group.groupSessions.filter(s => s.completed).length;
                        const allDone = groupCompleted === group.groupSessions.length;
                        // "Visual checklist" ND option: converts today's plan into a real
                        // checklist by always showing each session's checkbox for this
                        // subject, generated straight from the existing sessions — no
                        // separate checklist data of its own. Reuses the SAME per-session
                        // Checkbox + completeStudySession already wired to Calendar/Analytics.
                        const checklistOn = !!roadmapsBySubjectId[group.subjectId]?.neurodivergentOptions?.visualChecklist;
                        const isExpanded = checklistOn || !!expandedFocusGroups[group.key];
                        // "Low distraction" ND option: a couple of concise focus tips shown
                        // before this study block, rotating per group so they're not always
                        // the same two lines.
                        const lowDistractionOn = !!roadmapsBySubjectId[group.subjectId]?.neurodivergentOptions?.lowDistractionMode;
                        const focusTips = lowDistractionOn ? focusTipsFor(group.key) : [];
                        // "Flexible catch-up" ND option: missed sessions for this subject can
                        // be moved into that week's own reserved catch-up slot instead of
                        // just anywhere in the next 60 days.
                        const canCatchUp = !!roadmapsBySubjectId[group.subjectId]?.neurodivergentOptions?.flexibleCatchUp;
                        return (
                          <motion.div
                            key={group.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 rounded-lg border transition-all ${
                              allDone ? 'border-success/30 bg-success/5' : 'border-border hover:border-primary/30'
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Colour stripe */}
                              <div className={`h-12 w-1 rounded-full flex-shrink-0 ${group.color}`} />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <h4 className={`font-semibold truncate ${allDone ? 'text-muted-foreground line-through' : ''}`}>
                                      {group.subjectName}
                                    </h4>
                                    <p className={`text-sm truncate ${allDone ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'}`}>
                                      {group.topic}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-medium">{group.totalMinutes} min today</p>
                                    <p className="text-xs text-muted-foreground">
                                      {groupCompleted}/{group.groupSessions.length} sessions
                                    </p>
                                  </div>
                                </div>

                                {focusTips.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                    {focusTips.map((tip, ti) => (
                                      <span key={ti} className="flex items-center gap-1">🔕 {tip}</span>
                                    ))}
                                  </div>
                                )}

                                {/* Bulk complete + expand toggle */}
                                <div className="flex items-center gap-3 mt-3">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`group-${group.key}`}
                                      checked={allDone}
                                      disabled={allDone}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          group.groupSessions.filter(s => !s.completed).forEach(s => completeStudySession(s.id));
                                        }
                                      }}
                                      className="h-5 w-5"
                                      aria-label={`Mark all "${group.topic}" sessions complete`}
                                    />
                                    <label
                                      htmlFor={`group-${group.key}`}
                                      className={`text-sm cursor-pointer select-none ${allDone ? 'text-success font-medium' : 'text-muted-foreground'}`}
                                    >
                                      {allDone ? 'Completed ✓' : 'Mark all complete'}
                                    </label>
                                  </div>
                                  {group.groupSessions.length > 1 && !checklistOn && (
                                    <button
                                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                      onClick={() => setExpandedFocusGroups(prev => ({ ...prev, [group.key]: !isExpanded }))}
                                    >
                                      {isExpanded ? 'Hide timings' : 'Show timings'}
                                      <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                  )}
                                </div>

                                {/* Individual sessions — collapsible */}
                                {isExpanded && (
                                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                                    {group.groupSessions.map(session => (
                                      <div key={session.id} className="flex items-center justify-between gap-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={session.completed}
                                            disabled={session.completed}
                                            onCheckedChange={(checked) => { if (checked) completeStudySession(session.id); }}
                                            className="h-4 w-4"
                                            aria-label={`Mark session at ${session.startTime} complete`}
                                          />
                                          <span className={session.completed ? 'text-muted-foreground line-through' : ''}>
                                            {session.startTime ? fmt12h(session.startTime) : 'Anytime'}
                                            {session.endTime ? ` – ${fmt12h(session.endTime)}` : ''}
                                          </span>
                                          <span className="text-xs text-muted-foreground">({session.duration} min)</span>
                                        </div>
                                        {!session.completed && (
                                          <div className="flex items-center gap-1 flex-shrink-0">
                                            {session.status !== 'missed' && (
                                              <>
                                                <button
                                                  className="text-xs text-destructive hover:underline px-0"
                                                  onClick={() => markSessionMissed(session.id)}
                                                >
                                                  Missed
                                                </button>
                                                <span className="text-muted-foreground text-xs">·</span>
                                              </>
                                            )}
                                            {session.status === 'missed' && canCatchUp && (
                                              <>
                                                <button
                                                  className="text-xs text-warning hover:underline px-0"
                                                  onClick={() => moveMissedSessionToCatchUp(session.id)}
                                                >
                                                  Move to catch-up slot
                                                </button>
                                                <span className="text-muted-foreground text-xs">·</span>
                                              </>
                                            )}
                                            <button
                                              className="text-xs text-primary hover:underline px-0"
                                              onClick={() => rescheduleSession(session.id)}
                                            >
                                              Reschedule
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : derivedSessions.length > 0 ? (
                    /* Fallback derived sessions (no checkboxes — not real Firestore docs) */
                    <div className="space-y-3">
                      {derivedSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border transition-all ${
                            session.status === 'current'
                              ? 'border-primary bg-primary/5 shadow-lg animate-pulse'
                              : session.status === 'completed'
                              ? 'border-success/30 bg-success/5'
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`h-12 w-1 rounded-full ${session.color}`} />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <h4 className="font-semibold">{session.subject}</h4>
                                  <p className="text-sm text-muted-foreground">{session.topic}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{session.time}</p>
                                  <p className="text-xs text-muted-foreground">{session.duration} min</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        Generate a roadmap to get schedulable sessions with checkboxes
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-3">No study sessions scheduled for today</p>
                      <Button size="sm" variant="outline" onClick={() => navigate('/roadmap')}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate a Roadmap
                      </Button>
                    </div>
                  )}
              </Card>

              {/* Today's Checklist — AI-suggested activities for today's topics */}
              {todayChecklist.length > 0 && (
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Today's Checklist</h3>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {todayChecklist.filter(i => i.completed).length}/{todayChecklist.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {todayChecklist.map(item => (
                      <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                          className="h-4 w-4"
                        />
                        <span className={`text-sm ${item.completed ? 'text-muted-foreground line-through' : ''}`}>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </Card>
              )}

              {/* My Goals — persistent personal checklist */}
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">My Goals</h3>
                </div>
                <div className="flex gap-2 mb-3">
                  <Input
                    type="text"
                    value={newGoalText}
                    onChange={e => setNewGoalText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newGoalText.trim()) {
                        addGoal(newGoalText);
                        setNewGoalText('');
                      }
                    }}
                    placeholder="e.g. Finish notes, Solve Assignment 2…"
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newGoalText.trim()) {
                        addGoal(newGoalText);
                        setNewGoalText('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {myGoals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No goals yet — add your own study tasks above.</p>
                ) : (
                  <div className="space-y-1.5">
                    {myGoals.map(goal => (
                      <div key={goal.id} className="flex items-center gap-2 group">
                        <Checkbox
                          checked={goal.completed}
                          onCheckedChange={() => toggleGoal(goal.id)}
                          className="h-4 w-4"
                        />
                        <span className={`text-sm flex-1 ${goal.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {goal.text}
                        </span>
                        <button
                          onClick={() => removeGoal(goal.id)}
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove goal "${goal.text}"`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* This Week — compact cross-subject progress */}
              {thisWeekBySubject.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold text-sm mb-3">This Week</h3>
                  <div className="space-y-3">
                    {thisWeekBySubject.map(w => (
                      <div key={w.subjectId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`h-2 w-2 rounded-full flex-shrink-0 ${w.color}`} />
                            <span className="text-sm font-medium truncate">{w.subjectName}</span>
                            <span className="text-xs text-muted-foreground flex-shrink-0">Week {w.week.week}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {w.doneCount}/{w.week.topics.length || 0} topics
                          </span>
                        </div>
                        <Progress
                          value={w.week.topics.length ? (w.doneCount / w.week.topics.length) * 100 : 0}
                          className="h-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* AI Tip / Daily Motivation */}
              <Card className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{dailyTip}</p>
                </div>
              </Card>
            </motion.div>

            </div>

            {/* Edit Week dialog — personalize an already-generated week */}
            <Dialog open={editWeekIndex !== null} onOpenChange={open => !open && setEditWeekIndex(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    Edit Week {editWeekIndex !== null ? panelRoadmap?.weeklyPlans[editWeekIndex]?.week : ''}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Focus / Title</label>
                    <Input value={editFocus} onChange={e => setEditFocus(e.target.value)} placeholder="e.g. Neural networks fundamentals" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Topics</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newEditTopicText}
                        onChange={e => setNewEditTopicText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newEditTopicText.trim()) {
                            setEditTopics(prev => [...prev, { name: newEditTopicText.trim() }]);
                            setNewEditTopicText('');
                          }
                        }}
                        placeholder="Add a topic…"
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newEditTopicText.trim()) {
                            setEditTopics(prev => [...prev, { name: newEditTopicText.trim() }]);
                            setNewEditTopicText('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {editTopics.map((t, i) => (
                        <div key={i} className="px-2 py-0.5 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-1">
                          <span className="text-xs font-medium">{t.name}</span>
                          <button onClick={() => setEditTopics(prev => prev.filter((_, idx) => idx !== i))} className="text-primary hover:text-primary/70">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {editTopics.length === 0 && (
                        <p className="text-xs text-muted-foreground">No topics — add at least one above.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Weekly Goals</label>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={newEditGoalText}
                        onChange={e => setNewEditGoalText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newEditGoalText.trim()) {
                            setEditGoalsList(prev => [...prev, newEditGoalText.trim()]);
                            setNewEditGoalText('');
                          }
                        }}
                        placeholder="e.g. Finish notes, Solve 50 MCQs…"
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (newEditGoalText.trim()) {
                            setEditGoalsList(prev => [...prev, newEditGoalText.trim()]);
                            setNewEditGoalText('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {editGoalsList.map((g, i) => (
                        <div key={i} className="px-2 py-0.5 bg-secondary/10 border border-secondary/20 rounded-full flex items-center gap-1">
                          <span className="text-xs font-medium">{g}</span>
                          <button onClick={() => setEditGoalsList(prev => prev.filter((_, idx) => idx !== i))} className="text-secondary-foreground/70 hover:text-secondary-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Personal Notes</label>
                    <Textarea
                      value={editWeekNotes}
                      onChange={e => setEditWeekNotes(e.target.value)}
                      placeholder="Any notes for yourself about this week…"
                      rows={3}
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Note: this updates the roadmap and dashboard views immediately. Calendar sessions already
                    generated from this week's old topics won't be rewritten automatically.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setEditWeekIndex(null)}>Cancel</Button>
                  <Button
                    onClick={handleSaveWeekEdit}
                    disabled={editTopics.length === 0}
                    className="gradient-primary text-white"
                  >
                    Save Week
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Secondary widgets */}
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Subject Progress */}
              <motion.div variants={item} className="lg:col-span-2">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Subject Progress</h3>
                    <Button size="sm" variant="outline" onClick={() => navigate('/subjects')}>Manage</Button>
                  </div>
                  {subjects.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No subjects added yet</p>
                      <Button onClick={() => navigate('/subjects')} className="gradient-primary text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Subject
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subjects.map(subject => (
                        <div key={subject.id}>
                          <div className="flex justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`h-3 w-3 rounded ${subject.color}`} />
                              <span className="font-medium">{subject.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({subject.completedTopics}/{subject.totalTopics} topics)
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-primary">{subject.progress}%</span>
                          </div>
                          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${subject.progress}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                              className="absolute h-full gradient-primary rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Right column: Overall Progress, Quick Actions, Upcoming Exams */}
              <div className="space-y-6">
                {/* Overall Progress */}
                <motion.div variants={item}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Overall Progress</h3>
                    </div>
                    <div className="relative w-32 h-32 mx-auto mb-6">
                      <svg className="transform -rotate-90 w-32 h-32">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                        <circle
                          cx="64" cy="64" r="56" stroke="url(#gradient)" strokeWidth="8" fill="none"
                          strokeDasharray={`${2 * Math.PI * 56}`}
                          strokeDashoffset={`${2 * Math.PI * 56 * (1 - overallProgress / 100)}`}
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="hsl(186, 94%, 55%)" />
                            <stop offset="100%" stopColor="hsl(231, 48%, 48%)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-gradient">{overallProgress}%</p>
                          <p className="text-xs text-muted-foreground">Complete</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {upcomingExams[0] && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Next Exam</span>
                          <span className="font-semibold">{upcomingExams[0].daysLeft} days</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Hours Studied</span>
                        <span className="font-semibold">{totalStudyHours}h</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Topics Done</span>
                        <span className="font-semibold">
                          {subjects.reduce((a, s) => a + s.completedTopics, 0)} / {subjects.reduce((a, s) => a + s.totalTopics, 0)}
                        </span>
                      </div>
                      {totalToday > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Today's Sessions</span>
                          <span className="font-semibold text-success">{completedToday}/{totalToday}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>

                {/* Quick Actions */}
                <motion.div variants={item}>
                  <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/study-session')}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Pomodoro Timer
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/subjects')}>
                        <BookMarked className="h-4 w-4 mr-2" />
                        My Subjects
                      </Button>
                      <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/analytics')}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                    </div>
                  </Card>
                </motion.div>

                {/* Upcoming Exams */}
                <motion.div variants={item}>
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-xl font-semibold">Upcoming Exams</h3>
                    </div>
                    {upcomingExams.length === 0 ? (
                      <div className="text-center py-6">
                        <Calendar className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No exams scheduled</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingExams.map(exam => (
                          <div key={exam.subject} className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${exam.color}`} />
                                <h4 className="font-semibold">{exam.subject}</h4>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                exam.status === 'on-track' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>
                                {exam.status === 'on-track' ? 'On Track' : 'Needs Attention'}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-1">{exam.date}</p>
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                exam.daysLeft < 7 ? 'text-destructive' :
                                exam.daysLeft < 14 ? 'text-warning' : 'text-primary'
                              }`}>
                                {exam.daysLeft} days left
                              </p>
                              <Button size="sm" variant="ghost" onClick={() => navigate('/study-session')}>Study</Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </motion.div>
              </div>

            </motion.div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
