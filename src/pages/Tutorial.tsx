import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, BookOpen, CalendarDays, Sparkles, CheckSquare,
  Settings, LogOut, ChevronDown, ChevronUp, Brain, Clock,
  RotateCcw, Target, Save, Star, Flame,
} from 'lucide-react';

// ── Step data ─────────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: 1,
    icon: <BookOpen className="h-5 w-5 text-primary" />,
    title: 'Add Subjects & Syllabus',
    summary: 'Tell the app what you need to study.',
    details: [
      'Go to My Subjects from the navigation bar.',
      'Click "Add Subject" and enter a subject name (e.g. Mathematics, Biology).',
      'Inside each subject, add topics directly, with a short description of what each one covers.',
      'Mark topics as Pending, In Progress, or Completed as you go.',
      'Add an exam date to any subject — this helps the AI schedule urgently.',
    ],
    tip: 'You can colour-code subjects for easy visual tracking across the Calendar.',
  },
  {
    num: 2,
    icon: <Target className="h-5 w-5 text-warning" />,
    title: 'Set Exam Date & Weak Areas',
    summary: 'Help the AI prioritise what matters most.',
    details: [
      'On the AI Roadmap page, enter your exam date in the Exam Date field.',
      'Type your weak areas (e.g. "Organic Chemistry, Trigonometry") in the Weak Areas field — separate with commas.',
      'Set your current level: Beginner, Intermediate, or Advanced.',
      'Add personal goals if you have specific targets (e.g. "Score 90% in Physics").',
    ],
    tip: 'The AI gives extra weight to weak areas and schedules them more frequently.',
  },
  {
    num: 3,
    icon: <CalendarDays className="h-5 w-5 text-primary" />,
    title: 'Choose Your Study Days & Times',
    summary: 'Set when you are available to study.',
    details: [
      'In the Study Schedule section, click the day buttons (Mon–Sun) to toggle which days you study.',
      'Set your preferred Start Time and End Time using the time pickers.',
      'The app will only schedule sessions within this window on selected days.',
      'Example: Mon–Fri, 4:00 PM – 8:00 PM means sessions only appear in that slot on weekdays.',
    ],
    tip: 'Be realistic. Fewer days with consistent study beats ambitious plans you skip.',
  },
  {
    num: 4,
    icon: <Clock className="h-5 w-5 text-success" />,
    title: 'Pick Session Length & Breaks',
    summary: 'Control how long each session runs and how long breaks last.',
    details: [
      'Session Length slider (15–120 minutes): how long each study block will be.',
      'Break Length slider (5–30 minutes): the gap between back-to-back sessions on the same day.',
      'Focus Preference: Short (multiple short sessions), Long (fewer deep dives), or Mixed.',
      'Exam Urgency: High schedules more sessions per day; Low spreads them out.',
    ],
    tip: 'For most students, 45–60 minute sessions with 10–15 minute breaks work well.',
  },
  {
    num: 5,
    icon: <Brain className="h-5 w-5 text-purple-500" />,
    title: 'Enable Neurodivergent Support (Optional)',
    summary: 'Adapt the timetable for ADHD, dyslexia, autism, or other learning differences.',
    details: [
      'Toggle on "Neurodivergent Support" in the form.',
      'Shorter Sessions: caps each block at 30 minutes to reduce overwhelm.',
      'Extra Breaks: enforces a minimum 15-minute gap between sessions.',
      'Visual Checklist: the AI writes goals as tick-box steps instead of paragraphs.',
      'Flexible Catch-Up: reserves a buffer slot at the end of each week.',
      'Low Distraction: AI tips include environment setup advice.',
    ],
    tip: 'You can enable just the options that help you — they are independent checkboxes.',
    isND: true,
  },
  {
    num: 6,
    icon: <Sparkles className="h-5 w-5 text-primary" />,
    title: 'Generate Your Timetable with AI',
    summary: 'One click creates a complete week-by-week study plan.',
    details: [
      'Click "Generate AI Roadmap" at the bottom of the form.',
      'The AI (Grok) reads all your inputs and generates a roadmap in about 10–20 seconds.',
      'A preview dialog shows your roadmap title, week count, topics, and session count.',
      'Review the summary — if it looks wrong, close the dialog, adjust inputs, and regenerate.',
    ],
    tip: 'The AI also creates actual calendar sessions automatically — no manual entry needed.',
  },
  {
    num: 7,
    icon: <Save className="h-5 w-5 text-success" />,
    title: 'Save the Roadmap',
    summary: 'Saving locks in your timetable and populates the Calendar.',
    details: [
      'Click "Save Roadmap" in the preview dialog.',
      'All sessions are written to your account automatically.',
      'Navigate to Dashboard to see today\'s scheduled sessions.',
      'Navigate to Calendar to browse sessions across the full month.',
      'The roadmap also appears in the Dashboard banner with week-by-week focus areas.',
    ],
    tip: 'You can regenerate and save a new roadmap anytime — your session history is preserved.',
  },
  {
    num: 8,
    icon: <CalendarDays className="h-5 w-5 text-primary" />,
    title: 'Use the Calendar',
    summary: 'Browse, track, and manage all your study sessions.',
    details: [
      'Open the Calendar page from the navigation.',
      'Click any date to see its sessions on the right panel.',
      'Green dots = all sessions complete. Blue dots = sessions pending.',
      'The monthly stats row shows total, completed, pending sessions, and your streak.',
    ],
    tip: 'The Calendar also shows your current streak and best streak at a glance.',
  },
  {
    num: 9,
    icon: <CheckSquare className="h-5 w-5 text-success" />,
    title: 'Mark Sessions Complete',
    summary: 'Check off sessions as you finish them.',
    details: [
      'On Dashboard, each of today\'s sessions has a checkbox — tick it when done.',
      'On Calendar, each session in the detail panel has a "Mark as complete" checkbox.',
      'Completing a session credits your total study hours and can extend your streak.',
      'Completed sessions show a strikethrough and green border so you can see your progress clearly.',
    ],
    tip: 'Even partial sessions are worth completing — every minute counts toward your total.',
  },
  {
    num: 10,
    icon: <RotateCcw className="h-5 w-5 text-primary" />,
    title: 'Reschedule Missed Sessions',
    summary: "Life happens — move sessions you couldn't do to the next free slot.",
    details: [
      'On Calendar, non-completed sessions show "Missed", "Skip", and "Reschedule" buttons.',
      'Click "Missed" to mark a session as missed (it stays visible for the parent view).',
      'Click "Skip" to mark it as skipped without rescheduling.',
      'Click "Reschedule" to automatically move the session to the next available slot that fits your study window.',
      'The rescheduled session respects your available days, preferred times, and break lengths.',
    ],
    tip: 'Reschedule is smart — it checks existing sessions on the target day to avoid overlaps.',
  },
  {
    num: 11,
    icon: <Flame className="h-5 w-5 text-orange-500" />,
    title: 'Track Your Progress & Streaks',
    summary: 'Stay motivated by watching your numbers grow.',
    details: [
      'Dashboard shows total study hours, current streak, and subject progress.',
      'Motivation page shows your achievements/badges, weekly consistency, and an encouraging message.',
      'Parent View (/parent) gives a read-only summary for a parent or guardian to check progress.',
      'Streaks reset if you miss a day — but they restart the moment you study again.',
    ],
    tip: 'Even a 5-minute session on a busy day keeps your streak alive.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const Tutorial = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [openStep, setOpenStep] = useState<number | null>(1);

  const handleLogout = () => { logout(); navigate('/login'); };

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
                  How to Create a Custom Timetable
                </h1>
                <p className="text-sm text-muted-foreground">Step-by-step guide</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>Dashboard</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/roadmap')}>AI Roadmap</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>Calendar</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/motivation')}>Motivation</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/parent')}>Parent View</Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}><Settings className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-4">

        {/* Intro */}
        <Card className="p-5 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This guide walks you through creating a personalised, AI-generated study timetable from scratch.
            Each step takes about a minute. By the end, your Calendar will be populated with scheduled
            sessions tailored to your available times, exam dates, and learning style.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={() => navigate('/roadmap')} className="gradient-primary text-white">
              <Sparkles className="h-4 w-4 mr-1" /> Go to AI Roadmap
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/subjects')}>
              <BookOpen className="h-4 w-4 mr-1" /> My Subjects
            </Button>
          </div>
        </Card>

        {/* Neurodivergent callout */}
        <Card className="p-4 border-purple-200 bg-purple-50/50">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-700 mb-0.5">Neurodivergent-friendly options available</p>
              <p className="text-xs text-purple-600 leading-relaxed">
                The timetable generator includes built-in support for ADHD, dyslexia, autism, and other
                learning differences. See Step 5 below for details, or jump to Step 6 to generate now.
              </p>
            </div>
          </div>
        </Card>

        {/* Steps accordion */}
        <div className="space-y-2">
          {STEPS.map((step) => {
            const isOpen = openStep === step.num;
            return (
              <Card
                key={step.num}
                className={`overflow-hidden transition-all ${step.isND ? 'border-purple-200' : ''}`}
              >
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setOpenStep(isOpen ? null : step.num)}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    step.isND ? 'bg-purple-100 text-purple-700' : 'bg-primary/10 text-primary'
                  }`}>
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {step.icon}
                      <span className="font-semibold text-sm">{step.title}</span>
                      {step.isND && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                          ND Support
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.summary}</p>
                  </div>
                  {isOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`px-4 pb-4 pt-0 border-t ${step.isND ? 'border-purple-100' : 'border-border'}`}>
                        <ol className="mt-3 space-y-2">
                          {step.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-muted text-foreground text-[10px] font-semibold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              {d}
                            </li>
                          ))}
                        </ol>
                        {step.tip && (
                          <div className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                            step.isND
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'bg-primary/5 text-primary border border-primary/10'
                          }`}>
                            <span className="flex-shrink-0 mt-0.5">💡</span>
                            {step.tip}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>

        {/* Footer CTA */}
        <Card className="p-5 text-center bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
          <p className="text-sm text-muted-foreground mb-3">Ready? Head to the AI Roadmap to create your timetable.</p>
          <Button onClick={() => navigate('/roadmap')} className="gradient-primary text-white">
            <Sparkles className="h-4 w-4 mr-2" />
            Create My Timetable
          </Button>
        </Card>

      </main>
    </div>
  );
};

export default Tutorial;
