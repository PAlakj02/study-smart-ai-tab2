import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Clock, Flame, Trophy, BookOpen, Target,
  AlertTriangle, CheckCircle2, CalendarDays, Settings, LogOut,
  TrendingUp, Star,
} from 'lucide-react';

function toDay(d: string) { return d.substring(0, 10); }

const fmt = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const ParentProgress = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { subjects, sessions, totalStudyHours, currentStreak, bestStreak, roadmap } = useStudyData();

  // ── Derived totals ────────────────────────────────────────────────────────
  const completedSessions = useMemo(
    () => sessions.filter(s => s.completed === true || s.status === 'completed'),
    [sessions],
  );
  const missedSessions = useMemo(
    () => sessions.filter(s => s.status === 'missed'),
    [sessions],
  );
  const skippedSessions = useMemo(
    () => sessions.filter(s => s.status === 'skipped'),
    [sessions],
  );
  const pendingSessions = useMemo(
    () => sessions.filter(s => !s.completed && s.status !== 'missed' && s.status !== 'skipped'),
    [sessions],
  );

  const overallProgress = subjects.length > 0
    ? Math.round(subjects.reduce((a, s) => a + s.progress, 0) / subjects.length)
    : 0;

  // ── Last 7 days ───────────────────────────────────────────────────────────
  const weekStats = useMemo(() => {
    const today = new Date();
    const days: { label: string; done: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const daySessions = sessions.filter(s => toDay(s.date) === ds);
      days.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        done: daySessions.filter(s => s.completed || s.status === 'completed').length,
        total: daySessions.length,
      });
    }
    return days;
  }, [sessions]);

  const weekDaysStudied = weekStats.filter(d => d.done > 0).length;
  const weekSessionsDone = weekStats.reduce((a, d) => a + d.done, 0);

  // ── Recent completed (last 5) ─────────────────────────────────────────────
  const recentCompleted = useMemo(
    () => [...completedSessions]
      .sort((a, b) => toDay(b.date).localeCompare(toDay(a.date)))
      .slice(0, 5),
    [completedSessions],
  );

  // ── Needs attention: missed + skipped (last 5) ────────────────────────────
  const needsAttention = useMemo(
    () => [...missedSessions, ...skippedSessions]
      .sort((a, b) => toDay(b.date).localeCompare(toDay(a.date)))
      .slice(0, 5),
    [missedSessions, skippedSessions],
  );

  // ── Upcoming exams ────────────────────────────────────────────────────────
  const upcomingExams = subjects
    .filter(s => s.examDate)
    .map(s => ({
      subject: s.name,
      color: s.color,
      date: s.examDate!,
      daysLeft: Math.ceil((new Date(s.examDate!).getTime() - Date.now()) / 86_400_000),
      progress: s.progress,
    }))
    .filter(e => e.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Overview stat cards ───────────────────────────────────────────────────
  const overviewCards = [
    { icon: <Clock className="h-5 w-5 text-primary" />, bg: 'bg-primary/10', value: `${totalStudyHours}h`, label: 'Total Study Hours' },
    { icon: <Flame className="h-5 w-5 text-orange-500" />, bg: 'bg-orange-100', value: `${currentStreak}d`, label: 'Current Streak' },
    { icon: <Trophy className="h-5 w-5 text-yellow-500" />, bg: 'bg-yellow-100', value: `${bestStreak}d`, label: 'Best Streak' },
    { icon: <CheckCircle2 className="h-5 w-5 text-success" />, bg: 'bg-success/10', value: completedSessions.length, label: 'Sessions Completed' },
    { icon: <AlertTriangle className="h-5 w-5 text-warning" />, bg: 'bg-warning/10', value: missedSessions.length + skippedSessions.length, label: 'Missed / Skipped' },
    { icon: <TrendingUp className="h-5 w-5 text-info" />, bg: 'bg-info/10', value: `${overallProgress}%`, label: 'Avg Subject Progress' },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Star className="h-6 w-6 text-primary" />
                  Parent Progress View
                </h1>
                <p className="text-sm text-muted-foreground">Read-only summary for parents &amp; guardians</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>Calendar</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/motivation')}>Motivation</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tutorial')}>Tutorial</Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><Settings className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">

        {/* Read-only notice */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2 border border-border">
          <BookOpen className="h-4 w-4 flex-shrink-0" />
          This view is read-only and shows your student&apos;s current study progress.
        </div>

        {/* Overview cards */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Student Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {overviewCards.map(({ icon, bg, value, label }) => (
              <Card key={label} className="p-4">
                <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center mb-2`}>{icon}</div>
                <p className="text-2xl font-bold leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Last 7 days */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-5">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Last 7 Days
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Studied on <span className="font-semibold text-foreground">{weekDaysStudied}</span> of 7 days
              &nbsp;·&nbsp; <span className="font-semibold text-foreground">{weekSessionsDone}</span> sessions completed
            </p>
            <div className="grid grid-cols-7 gap-1">
              {weekStats.map(({ label, done, total }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div
                    className={`h-10 w-full rounded-md text-xs font-medium flex items-center justify-center ${
                      done > 0
                        ? 'bg-success/20 text-success'
                        : total > 0
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {done > 0 ? done : total > 0 ? '–' : ''}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-success/20 inline-block" /> Sessions completed</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-destructive/10 inline-block" /> Sessions missed</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-muted inline-block" /> No sessions</span>
            </div>
          </Card>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Subject progress */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5 h-full">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> Subject Progress
              </h2>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No subjects added yet.</p>
              ) : (
                <div className="space-y-4">
                  {subjects.map(s => (
                    <div key={s.id}>
                      <div className="flex justify-between mb-1 text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                          <span className="font-medium">{s.name}</span>
                        </span>
                        <span className="text-muted-foreground">
                          {s.completedTopics}/{s.totalTopics} topics &nbsp;·&nbsp;
                          <span className="font-semibold text-foreground">{s.progress}%</span>
                        </span>
                      </div>
                      <Progress value={s.progress} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Upcoming exams */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Card className="p-5 h-full">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Upcoming Exams
              </h2>
              {upcomingExams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No exams scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map(e => (
                    <div key={e.subject} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <span className={`h-3 w-3 rounded-full flex-shrink-0 mt-1 ${e.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{e.subject}</p>
                        <p className="text-xs text-muted-foreground">{fmt(e.date)}</p>
                        <Progress value={e.progress} className="h-1.5 mt-1.5" />
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                        e.daysLeft <= 7 ? 'text-destructive' : e.daysLeft <= 14 ? 'text-warning' : 'text-primary'
                      }`}>
                        {e.daysLeft}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* Recent completed sessions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" /> Recent Completed Sessions
              </h2>
              {recentCompleted.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No completed sessions yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentCompleted.map(s => (
                    <div key={s.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.subjectName ?? 'Study session'}</p>
                        {s.topic && <p className="text-xs text-muted-foreground truncate">{s.topic}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{toDay(s.date)}</p>
                        <p className="text-xs font-medium">{s.duration} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* Needs attention */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Needs Attention
              </h2>
              {needsAttention.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                  <p className="text-sm text-muted-foreground">No missed or skipped sessions.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {needsAttention.map(s => (
                    <div key={s.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${
                        s.status === 'missed' ? 'bg-destructive' : 'bg-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.subjectName ?? 'Study session'}</p>
                        {s.topic && <p className="text-xs text-muted-foreground truncate">{s.topic}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">{toDay(s.date)}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          s.status === 'missed'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {s.status === 'missed' ? 'Missed' : 'Skipped'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

        </div>

        {/* Roadmap note */}
        {roadmap && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Card className="p-4 bg-primary/5 border-primary/20">
              <p className="text-sm">
                <span className="font-semibold">Active study plan:</span> {roadmap.title} &nbsp;·&nbsp; {roadmap.totalWeeks} weeks
                {roadmap.weeklyPlans[0] && (
                  <> &nbsp;·&nbsp; Current focus: <span className="font-medium">{roadmap.weeklyPlans[0].focus}</span></>
                )}
              </p>
            </Card>
          </motion.div>
        )}

      </main>
    </div>
  );
};

export default ParentProgress;
