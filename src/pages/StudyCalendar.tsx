import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData, StudySession } from '@/context/StudyDataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { MobileNavMenu } from '@/components/MobileNavMenu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  CheckCircle2,
  Clock,
  Target,
  Timer,
  Sparkles,
  Settings,
  BookMarked,
  BarChart3,
  LogOut,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayStatus = 'none' | 'complete' | 'pending';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Done',      cls: 'bg-success/10 text-success border-success/30' },
  scheduled: { label: 'Scheduled', cls: 'bg-primary/10 text-primary border-primary/30' },
  missed:    { label: 'Missed',    cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  skipped:   { label: 'Skipped',   cls: 'bg-muted text-muted-foreground border-border' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a local Date to a "YYYY-MM-DD" string without timezone shift */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "HH:MM" → "4:00 PM" */
function fmt12h(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** Build a 6-row × 7-column month grid of Date | null */
function makeMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const grid: (Date | null)[][] = [];
  let week: (Date | null)[] = Array<null>(first.getDay()).fill(null);

  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    grid.push(week);
  }
  return grid;
}

/** Get effective status string from a session (backward-compat) */
function effectiveStatus(s: StudySession): string {
  if (s.status) return s.status;
  return s.completed ? 'completed' : 'scheduled';
}

// ── Component ─────────────────────────────────────────────────────────────────

const StudyCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // `sessions` is the single source of truth shared with Dashboard/Analytics —
  // StudyDataContext re-syncs it from Firestore after every roadmap create/
  // edit/delete, so it's read here directly with no page-local filtering.
  const {
    sessions, subjects, roadmap, roadmapsBySubjectId, legacyRoadmaps, loading,
    completeStudySession, markSessionMissed, markSessionSkipped, rescheduleSession, moveMissedSessionToCatchUp,
    updateStudySession, currentStreak, bestStreak,
  } = useStudyData();
  const isNDPlan = !!(roadmap as { neurodivergentSupport?: boolean } | null)?.neurodivergentSupport;

  // "Flexible catch-up": true only when the session's OWN roadmap (not just
  // "any" recent roadmap) has the option on — every week of such a roadmap
  // reserves its own catch-up day at generation time.
  const canCatchUp = (session: StudySession) => {
    if (!session.roadmapId) return false;
    const rm = Object.values(roadmapsBySubjectId).find(r => r.id === session.roadmapId)
      ?? legacyRoadmaps.find(r => r.id === session.roadmapId);
    return !!rm?.neurodivergentOptions?.flexibleCatchUp;
  };

  const today = new Date();
  const todayStr = toDateStr(today);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr);

  // ── Build date → session[] map ────────────────────────────────────────────
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const s of sessions) {
      const key = s.date.substring(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [sessions]);

  // ── Month grid ────────────────────────────────────────────────────────────
  const grid = useMemo(() => makeMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // ── Month-level stats ─────────────────────────────────────────────────────
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const thisMonthSessions = useMemo(
    () => sessions.filter(s => s.date.startsWith(monthPrefix)),
    [sessions, monthPrefix],
  );
  const completedThisMonth = thisMonthSessions.filter(s => s.completed).length;
  const pendingThisMonth   = thisMonthSessions.length - completedThisMonth;
  const todaySessions      = useMemo(() => sessionsByDate.get(todayStr) ?? [], [sessionsByDate, todayStr]);

  // ── Selected-date sessions (sorted by startTime) ──────────────────────────
  const selectedSessions = useMemo(
    () =>
      (sessionsByDate.get(selectedDateStr) ?? []).sort((a, b) =>
        (a.startTime ?? 'ZZ').localeCompare(b.startTime ?? 'ZZ'),
      ),
    [sessionsByDate, selectedDateStr],
  );
  const completedOnSelected = selectedSessions.filter(s => s.completed).length;

  // ── Subject colour ────────────────────────────────────────────────────────
  const subjectColor = (subjectId?: string, name?: string) =>
    subjects.find(s => s.id === subjectId)?.color
      ?? subjects.find(s => s.name === name)?.color
      ?? 'bg-primary';

  // ── Group the selected day's sessions by subject (then by topic within each
  //    subject) so the panel shows one expandable card per subject instead of
  //    one card per session. Grouping/sorting only — no scheduling logic here. ──
  const selectedDayGroups = useMemo(() => {
    type SubjectGroup = {
      key: string;
      subjectId: string;
      subjectName: string;
      color: string;
      sessions: StudySession[];
      topicGroups: { topic: string; sessions: StudySession[] }[];
      totalMinutes: number;
      completedCount: number;
    };
    const map = new Map<string, SubjectGroup>();
    for (const s of selectedSessions) {
      const key = s.subjectId || s.subjectName || 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          key,
          subjectId: s.subjectId,
          subjectName: s.subjectName ?? 'Study session',
          color: subjectColor(s.subjectId, s.subjectName),
          sessions: [],
          topicGroups: [],
          totalMinutes: 0,
          completedCount: 0,
        });
      }
      const group = map.get(key)!;
      group.sessions.push(s);
      group.totalMinutes += s.duration;
      if (s.completed) group.completedCount++;

      const topicKey = s.topic ?? 'Study session';
      let topicGroup = group.topicGroups.find(t => t.topic === topicKey);
      if (!topicGroup) {
        topicGroup = { topic: topicKey, sessions: [] };
        group.topicGroups.push(topicGroup);
      }
      topicGroup.sessions.push(s);
    }
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessions, subjects]);

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // ── Edit Session dialog — manually move/resize/retopic an individual
  //    session (date, start/end time, topic); duration is derived from the
  //    time range rather than edited as an independent field. ───────────────
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editTopic, setEditTopic] = useState('');

  const editingSession = sessions.find(s => s.id === editSessionId) ?? null;

  const openEditSession = (session: StudySession) => {
    setEditSessionId(session.id);
    setEditDate(session.date.substring(0, 10));
    setEditStartTime(session.startTime ?? '16:00');
    setEditEndTime(session.endTime ?? '17:00');
    setEditTopic(session.topic ?? '');
  };

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  /** Finds another session on the same date whose time range overlaps —
   *  across ALL subjects, so e.g. Physics 4-6pm blocks Math from also
   *  starting at 5pm, but doesn't block Math at 6-7pm. */
  const findConflict = (sessionId: string, date: string, startTime: string, endTime: string) => {
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    const daySessions = sessionsByDate.get(date) ?? [];
    return daySessions.find(s => {
      if (s.id === sessionId || !s.startTime || !s.endTime) return false;
      const existStart = timeToMinutes(s.startTime);
      const existEnd = timeToMinutes(s.endTime);
      return newStart < existEnd && existStart < newEnd;
    });
  };

  const editDurationMinutes = editStartTime && editEndTime
    ? timeToMinutes(editEndTime) - timeToMinutes(editStartTime)
    : 0;

  const handleSaveSessionEdit = async () => {
    if (!editSessionId) return;
    if (editDurationMinutes <= 0) {
      toast.error('End time must be after start time');
      return;
    }
    const conflict = findConflict(editSessionId, editDate, editStartTime, editEndTime);
    if (conflict) {
      toast.error(
        `Conflicts with ${conflict.subjectName ?? 'another session'}`,
        { description: `${fmt12h(conflict.startTime!)} – ${fmt12h(conflict.endTime!)} on this date` },
      );
      return;
    }
    await updateStudySession(editSessionId, {
      date: editDate,
      startTime: editStartTime,
      endTime: editEndTime,
      duration: editDurationMinutes,
      topic: editTopic.trim() || undefined,
    });
    toast.success('Session updated');
    setEditSessionId(null);
  };

  // ── Calendar navigation ───────────────────────────────────────────────────
  const prevMonth = () =>
    viewMonth === 0 ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () =>
    viewMonth === 11 ? (setViewMonth(0), setViewYear(y => y + 1)) : setViewMonth(m => m + 1);
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDateStr(todayStr);
  };

  // ── Day dot status ────────────────────────────────────────────────────────
  const getDayStatus = (dateStr: string): DayStatus => {
    const ds = sessionsByDate.get(dateStr);
    if (!ds || ds.length === 0) return 'none';
    return ds.every(s => s.completed) ? 'complete' : 'pending';
  };

  // ── Brief "what to study" hint for a day — not the full plan, just a peek ──
  const dayHint = (dateStr: string): string | null => {
    const daySessions = sessionsByDate.get(dateStr);
    if (!daySessions || daySessions.length === 0) return null;
    const topics = daySessions.map(s => s.topic).filter(Boolean) as string[];
    if (topics.length === 0) return null;
    return topics.length > 1 ? `${topics[0]} +${topics.length - 1} more` : topics[0];
  };

  // ── Exam dates, keyed by "YYYY-MM-DD" → subject name(s) ───────────────────
  const examDatesByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of subjects) {
      if (!s.examDate) continue;
      const key = s.examDate.substring(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s.name);
    }
    return map;
  }, [subjects]);

  // ── Human-readable selected date ──────────────────────────────────────────
  const selectedDateDisplay = (() => {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  })();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ── */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  Study Calendar
                </h1>
                <p className="text-sm text-muted-foreground">Your timetable at a glance</p>
              </div>
            </div>

            {/* Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/roadmap')}>AI Roadmap</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/motivation')}>Motivation</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/parent')}>Parent View</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tutorial')}>Tutorial</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>My Subjects</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>Analytics</Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><Settings className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </div>
            <MobileNavMenu
              items={[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'AI Roadmap', path: '/roadmap' },
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
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-semibold">Loading your calendar…</h3>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* ── Stats row ── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                {
                  icon: <CalendarDays className="h-5 w-5 text-primary" />,
                  bg: 'bg-primary/10',
                  value: thisMonthSessions.length,
                  label: `Sessions in ${MONTH_NAMES[viewMonth]}`,
                },
                {
                  icon: <CheckCircle2 className="h-5 w-5 text-success" />,
                  bg: 'bg-success/10',
                  value: completedThisMonth,
                  label: 'Completed',
                },
                {
                  icon: <Clock className="h-5 w-5 text-warning" />,
                  bg: 'bg-warning/10',
                  value: pendingThisMonth,
                  label: 'Pending',
                },
                {
                  icon: <Target className="h-5 w-5 text-info" />,
                  bg: 'bg-info/10',
                  value: `${todaySessions.filter(s => s.completed).length}/${todaySessions.length || '–'}`,
                  label: "Today's Done",
                },
                {
                  icon: <span className="text-lg leading-none">🔥</span>,
                  bg: 'bg-orange-100',
                  value: `${currentStreak}d`,
                  label: `Streak · best ${bestStreak}d`,
                },
              ].map(({ icon, bg, value, label }) => (
                <Card key={label} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                      {icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* ── Two-column layout ── */}
            <div className="grid lg:grid-cols-5 gap-6 items-start">

              {/* ── Month grid (3 cols) ── */}
              <Card className="lg:col-span-3 p-5">

                {/* Month nav */}
                <div className="flex items-center justify-between mb-4">
                  <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="text-center">
                    <h2 className="text-lg font-semibold">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Today shortcut */}
                <div className="flex justify-center mb-5">
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Jump to Today
                  </Button>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="space-y-1">
                  {grid.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1">
                      {week.map((date, di) => {
                        if (!date) return <div key={di} className="h-11" />;

                        const ds       = toDateStr(date);
                        const status   = getDayStatus(ds);
                        const selected = ds === selectedDateStr;
                        const isToday  = ds === todayStr;

                        const hint = dayHint(ds);
                        const examSubjects = examDatesByDate.get(ds);
                        const isExamDate = !!examSubjects?.length;
                        const title = isExamDate
                          ? `🎯 Exam: ${examSubjects!.join(', ')}${hint ? ` — ${hint}` : ''}`
                          : hint ?? undefined;

                        return (
                          <button
                            key={di}
                            onClick={() => setSelectedDateStr(ds)}
                            aria-label={`Select ${ds}`}
                            aria-pressed={selected}
                            title={title}
                            className={[
                              'h-11 w-full rounded-lg flex flex-col items-center justify-center gap-0.5',
                              'text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              isExamDate && !selected ? 'ring-2 ring-destructive/60' : '',
                              selected
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : isToday
                                ? 'ring-2 ring-primary/40 bg-accent text-accent-foreground'
                                : 'hover:bg-muted text-foreground',
                            ].join(' ')}
                          >
                            <span className="leading-none">{date.getDate()}</span>

                            {/* Session dot + exam dot indicators */}
                            <span className="flex items-center gap-0.5 h-1.5">
                              {status !== 'none' && (
                                <span
                                  className={[
                                    'h-1.5 w-1.5 rounded-full',
                                    selected
                                      ? 'bg-primary-foreground/70'
                                      : status === 'complete'
                                      ? 'bg-success'
                                      : 'bg-primary',
                                  ].join(' ')}
                                />
                              )}
                              {isExamDate && (
                                <span className={`h-1.5 w-1.5 rounded-full ${selected ? 'bg-primary-foreground/70' : 'bg-destructive'}`} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    All done
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    Sessions pending
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-primary/40 bg-accent" />
                    Today
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full ring-2 ring-destructive/60 bg-background" />
                    Exam date
                  </div>
                </div>
              </Card>

              {/* ── Session list (2 cols) ── */}
              <Card className="lg:col-span-2 p-5">

                {/* Header */}
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm leading-snug">{selectedDateDisplay}</h3>
                    {selectedSessions.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {completedOnSelected} / {selectedSessions.length} sessions completed
                      </p>
                    )}
                  </div>
                  {selectedSessions.length > 0 && (
                    <span
                      className={`flex-shrink-0 text-xs px-2 py-1 rounded-full font-medium ${
                        completedOnSelected === selectedSessions.length
                          ? 'bg-success/10 text-success'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {completedOnSelected === selectedSessions.length
                        ? 'All done!'
                        : `${selectedSessions.length - completedOnSelected} left`}
                    </span>
                  )}
                </div>

                {/* Jump to the AI roadmap for this day's subject on the Dashboard */}
                {selectedSessions.length > 0 && selectedSessions[0].subjectId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mb-4"
                    onClick={() =>
                      navigate(`/dashboard?subjectId=${selectedSessions[0].subjectId}&date=${selectedDateStr}`)
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    View in Dashboard
                  </Button>
                )}

                {/* Session list or empty state */}
                {selectedSessions.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No sessions for this date</p>
                    {selectedDateStr >= todayStr && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate('/roadmap')}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Roadmap
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-0.5">
                    {selectedDayGroups.map(group => {
                      const isOpen = !!expandedSubjects[group.key];
                      const allDone = group.completedCount === group.sessions.length;
                      const topicLabel = group.topicGroups.length > 1
                        ? `${group.topicGroups[0].topic} +${group.topicGroups.length - 1} more`
                        : group.topicGroups[0]?.topic;

                      return (
                        <motion.div
                          key={group.key}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Card className={`overflow-hidden ${allDone ? 'bg-success/5 border-success/20' : 'border-border'}`}>
                            {/* Collapsed summary — click to expand */}
                            <button
                              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                              onClick={() => setExpandedSubjects(prev => ({ ...prev, [group.key]: !isOpen }))}
                              aria-expanded={isOpen}
                            >
                              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${group.color}`} />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className={`text-sm font-semibold leading-tight truncate ${allDone ? 'text-muted-foreground line-through' : ''}`}>
                                    {group.subjectName}
                                  </p>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                                    allDone ? 'bg-success/10 text-success border-success/30' : 'bg-primary/10 text-primary border-primary/30'
                                  }`}>
                                    {allDone ? 'All done' : `${group.sessions.length - group.completedCount} left`}
                                  </span>
                                </div>
                                {topicLabel && (
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{topicLabel}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Timer className="h-3 w-3 flex-shrink-0" />
                                    {group.totalMinutes} min
                                  </span>
                                  <span>{group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}</span>
                                  <span>{group.completedCount}/{group.sessions.length} completed</span>
                                </div>
                              </div>

                              <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Expanded — individual sessions, chronological, grouped by topic when there's more than one */}
                            {isOpen && (
                              <div className="border-t border-border p-3 space-y-3 bg-muted/10">
                                {group.topicGroups.map(topicGroup => (
                                  <div key={topicGroup.topic}>
                                    {group.topicGroups.length > 1 && (
                                      <p className="text-xs font-medium text-muted-foreground mb-1.5">{topicGroup.topic}</p>
                                    )}
                                    <div className="space-y-2">
                                      {topicGroup.sessions.map(session => {
                                        const status = effectiveStatus(session);
                                        const badge = STATUS_BADGE[status] ?? STATUS_BADGE['scheduled'];
                                        return (
                                          <div
                                            key={session.id}
                                            className={`flex items-start gap-2.5 p-2 rounded-md border ${
                                              session.completed ? 'bg-success/5 border-success/20' : 'bg-background border-border'
                                            }`}
                                          >
                                            <div className="flex flex-col items-end flex-shrink-0 w-14 pt-0.5">
                                              {session.startTime ? (
                                                <>
                                                  <span className="text-xs font-bold leading-tight">{fmt12h(session.startTime)}</span>
                                                  {session.endTime && (
                                                    <span className="text-[10px] text-muted-foreground leading-tight">{fmt12h(session.endTime)}</span>
                                                  )}
                                                </>
                                              ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                              )}
                                            </div>

                                            <div className="flex-1 min-w-0 space-y-1">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                                                  {badge.label}
                                                </span>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Timer className="h-3 w-3" />
                                                    {session.duration} min
                                                  </span>
                                                  <button
                                                    className="text-muted-foreground hover:text-primary p-0.5"
                                                    onClick={() => openEditSession(session)}
                                                    aria-label="Edit session"
                                                  >
                                                    <Pencil className="h-3 w-3" />
                                                  </button>
                                                </div>
                                              </div>

                                              {isNDPlan && session.roadmapId && (
                                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 font-medium">
                                                  🧠 Focus-friendly plan
                                                </span>
                                              )}

                                              {/* Completion checkbox */}
                                              <div className="flex items-center gap-2 pt-0.5">
                                                <Checkbox
                                                  id={`cal-${session.id}`}
                                                  checked={session.completed}
                                                  disabled={session.completed}
                                                  onCheckedChange={checked => {
                                                    if (checked) completeStudySession(session.id);
                                                  }}
                                                  className="h-4 w-4"
                                                  aria-label={`Mark "${session.topic ?? 'session'}" as complete`}
                                                />
                                                <label
                                                  htmlFor={`cal-${session.id}`}
                                                  className={`text-xs select-none ${
                                                    session.completed
                                                      ? 'text-success font-medium'
                                                      : 'text-muted-foreground cursor-pointer'
                                                  }`}
                                                >
                                                  {session.completed ? 'Completed ✓' : 'Mark as complete'}
                                                </label>
                                              </div>

                                              {/* Adaptive action buttons (non-completed sessions only) */}
                                              {!session.completed && (
                                                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                                  {status !== 'missed' && status !== 'skipped' && (
                                                    <>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => markSessionMissed(session.id)}
                                                      >
                                                        Missed
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:bg-muted"
                                                        onClick={() => markSessionSkipped(session.id)}
                                                      >
                                                        Skip
                                                      </Button>
                                                    </>
                                                  )}
                                                  {status === 'missed' && canCatchUp(session) && (
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-5 px-1.5 text-[10px] text-warning hover:text-warning hover:bg-warning/10"
                                                      onClick={() => moveMissedSessionToCatchUp(session.id)}
                                                    >
                                                      Move to catch-up slot
                                                    </Button>
                                                  )}
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-5 px-1.5 text-[10px] text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={() => rescheduleSession(session.id)}
                                                  >
                                                    Reschedule
                                                  </Button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Card>

            </div>

            {/* Edit Session dialog — manually move/resize/retopic one session */}
            <Dialog open={editSessionId !== null} onOpenChange={open => !open && setEditSessionId(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Session{editingSession?.subjectName ? ` — ${editingSession.subjectName}` : ''}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                    <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Start Time</label>
                      <Input type="time" value={editStartTime} onChange={e => setEditStartTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">End Time</label>
                      <Input type="time" value={editEndTime} onChange={e => setEditEndTime(e.target.value)} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Duration: <span className={`font-medium ${editDurationMinutes <= 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {editDurationMinutes > 0 ? `${editDurationMinutes} min` : 'End time must be after start time'}
                    </span>
                  </p>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Topic</label>
                    <Input value={editTopic} onChange={e => setEditTopic(e.target.value)} placeholder="What are you studying?" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Moving this session to a time that overlaps another subject's session on the same day will be blocked —
                    pick a different slot (e.g. Physics 4–6 PM, Math 6–7 PM) to keep the day conflict-free.
                  </p>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setEditSessionId(null)}>Cancel</Button>
                  <Button onClick={handleSaveSessionEdit} className="gradient-primary text-white">
                    Save Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── No sessions at all — CTA ── */}
            {sessions.length === 0 && (
              <Card className="p-8 text-center bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
                <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No sessions yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Generate a study roadmap to automatically create scheduled sessions across your calendar.
                </p>
                <Button onClick={() => navigate('/roadmap')} className="gradient-primary text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Roadmap
                </Button>
              </Card>
            )}

          </motion.div>
        )}
      </main>
    </div>
  );
};

export default StudyCalendar;
