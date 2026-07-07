import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MobileNavMenu } from '@/components/MobileNavMenu';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Flame, Star, Trophy, Clock, CheckCircle2,
  BookOpen, Zap, Target, Settings, LogOut, CalendarDays,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  unlocked: boolean;
}

// ── Motivational message ──────────────────────────────────────────────────────

function getMotivationalMessage(currentStreak: number, completedToday: boolean): { heading: string; body: string } {
  if (completedToday && currentStreak >= 7) {
    return {
      heading: 'Unstoppable! 🚀',
      body: `You're on a ${currentStreak}-day streak and already studied today. That kind of consistency is what separates good from great.`,
    };
  }
  if (completedToday) {
    return {
      heading: "Today's already a win! 🎉",
      body: "You've completed at least one session today. Keep the momentum going — every session adds up.",
    };
  }
  if (currentStreak >= 7) {
    return {
      heading: `${currentStreak} days strong! 🔥`,
      body: "Your consistency is remarkable. Don't let today break the chain — even one short session counts.",
    };
  }
  if (currentStreak >= 3) {
    return {
      heading: 'Building real momentum 💪',
      body: "A growing streak means a growing habit. Keep showing up and the results will follow.",
    };
  }
  if (currentStreak === 0) {
    return {
      heading: 'Every expert was once a beginner',
      body: "Starting or restarting is the hardest part — and you're already here. Complete one session today to light the streak back up.",
    };
  }
  return {
    heading: "You're on your way! ⭐",
    body: 'Consistency beats intensity. A little study every day compounds into big results.',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const Motivation = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    sessions,
    totalStudyHours,
    currentStreak,
    bestStreak,
    completedToday,
  } = useStudyData();

  const completedSessions = useMemo(
    () => sessions.filter(s => s.completed === true || s.status === 'completed').length,
    [sessions],
  );

  // Weekly consistency: completed days in the last 7 calendar days
  const weeklyDaysStudied = useMemo(() => {
    const set = new Set<string>();
    const today = new Date();
    for (const s of sessions) {
      if (s.completed !== true && s.status !== 'completed') continue;
      const d = new Date(s.date.substring(0, 10));
      const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
      if (diff >= 0 && diff < 7) set.add(s.date.substring(0, 10));
    }
    return set.size;
  }, [sessions]);

  const weeklyGoal = 5; // days per week
  const weeklyPct = Math.min(100, Math.round((weeklyDaysStudied / weeklyGoal) * 100));

  const badges: Badge[] = [
    {
      id: 'first-session',
      emoji: '🌱',
      title: 'First Session',
      desc: 'Complete your first study session',
      unlocked: completedSessions >= 1,
    },
    {
      id: 'streak-3',
      emoji: '🔥',
      title: '3-Day Streak',
      desc: 'Study 3 days in a row',
      unlocked: bestStreak >= 3,
    },
    {
      id: 'streak-7',
      emoji: '⚡',
      title: 'Week Warrior',
      desc: 'Study 7 days in a row',
      unlocked: bestStreak >= 7,
    },
    {
      id: 'sessions-10',
      emoji: '🎯',
      title: '10 Sessions',
      desc: 'Complete 10 study sessions',
      unlocked: completedSessions >= 10,
    },
    {
      id: 'hours-25',
      emoji: '📚',
      title: '25 Hours',
      desc: 'Log 25 total study hours',
      unlocked: totalStudyHours >= 25,
    },
    {
      id: 'today',
      emoji: '☀️',
      title: 'Studied Today',
      desc: 'Complete a session today',
      unlocked: completedToday,
    },
  ];

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const message = getMotivationalMessage(currentStreak, completedToday);

  const handleLogout = () => { logout(); navigate('/login'); };

  const stats = [
    { icon: <Flame className="h-5 w-5 text-orange-500" />, bg: 'bg-orange-100', value: `${currentStreak}d`, label: 'Current Streak' },
    { icon: <Trophy className="h-5 w-5 text-yellow-500" />, bg: 'bg-yellow-100', value: `${bestStreak}d`, label: 'Best Streak' },
    { icon: <CheckCircle2 className="h-5 w-5 text-success" />, bg: 'bg-success/10', value: completedSessions, label: 'Sessions Done' },
    { icon: <Clock className="h-5 w-5 text-primary" />, bg: 'bg-primary/10', value: `${totalStudyHours}h`, label: 'Hours Studied' },
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
                  <Star className="h-6 w-6 text-yellow-500" />
                  Motivation
                </h1>
                <p className="text-sm text-muted-foreground">Your progress &amp; achievements</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                <CalendarDays className="h-4 w-4 mr-1" />Calendar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/roadmap')}>AI Roadmap</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/parent')}>Parent View</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tutorial')}>Tutorial</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>My Subjects</Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><Settings className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </div>
            <MobileNavMenu
              items={[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Calendar', path: '/calendar' },
                { label: 'AI Roadmap', path: '/roadmap' },
                { label: 'Parent View', path: '/parent' },
                { label: 'Tutorial', path: '/tutorial' },
                { label: 'My Subjects', path: '/subjects' },
              ]}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">

        {/* Motivational banner */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 bg-gradient-to-r from-primary/5 to-yellow-50 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">{message.heading}</h2>
                <p className="text-muted-foreground leading-relaxed">{message.body}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map(({ icon, bg, value, label }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  {icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        {/* Today status + weekly consistency */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Weekly Consistency
            </h3>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">{weeklyDaysStudied} / {weeklyGoal} study days this week</span>
              <span className="font-semibold text-primary">{weeklyPct}%</span>
            </div>
            <Progress value={weeklyPct} className="h-3" />
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              completedToday ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}>
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {completedToday ? 'You have studied today — great job!' : 'No session completed yet today'}
            </div>
          </Card>
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {unlockedCount} / {badges.length} unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.22 + i * 0.05 }}
                  className={`rounded-xl border p-4 text-center transition-all ${
                    badge.unlocked
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-border bg-muted/30 opacity-50'
                  }`}
                >
                  <div className={`text-3xl mb-2 ${badge.unlocked ? '' : 'grayscale'}`}>
                    {badge.unlocked ? badge.emoji : '🔒'}
                  </div>
                  <p className={`text-sm font-semibold leading-tight ${badge.unlocked ? '' : 'text-muted-foreground'}`}>
                    {badge.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{badge.desc}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              Keep Going
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/study-session')} className="gradient-primary text-white">
                Start a Session
              </Button>
              <Button variant="outline" onClick={() => navigate('/calendar')}>View Calendar</Button>
              <Button variant="outline" onClick={() => navigate('/roadmap')}>My Roadmap</Button>
            </div>
          </Card>
        </motion.div>

      </main>
    </div>
  );
};

export default Motivation;
