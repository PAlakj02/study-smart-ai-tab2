import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { generateStudyRoadmap, RoadmapInput } from '@/services/geminiService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Zap,
  Target,
  Calendar,
  Clock,
  Save,
  X,
  Brain,
  Timer,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { toast } from 'sonner';

const DAY_LABELS = [
  { label: 'Su', value: 0 },
  { label: 'Mo', value: 1 },
  { label: 'Tu', value: 2 },
  { label: 'We', value: 3 },
  { label: 'Th', value: 4 },
  { label: 'Fr', value: 5 },
  { label: 'Sa', value: 6 },
];

const DEFAULT_ND_OPTIONS = {
  shorterSessions: false,
  extraBreaks: false,
  visualChecklist: false,
  flexibleCatchUp: false,
  lowDistractionMode: false,
};

const DEFAULT_FORM: RoadmapInput = {
  subjects: [],
  examDate: '',
  currentLevel: 'intermediate',
  studyHoursPerDay: 6,
  weakAreas: [],
  goals: '',
  availableStudyDays: [1, 2, 3, 4, 5, 6],
  preferredStartTime: '16:00',
  preferredEndTime: '20:00',
  sessionLengthMinutes: 60,
  breakLengthMinutes: 10,
  examUrgency: 'medium',
  focusPreference: 'mixed',
  includeBufferDays: true,
  neurodivergentSupport: false,
  neurodivergentOptions: { ...DEFAULT_ND_OPTIONS },
};

const RoadmapGenerator = () => {
  const navigate = useNavigate();
  const { saveRoadmap, subjects, addSubject } = useStudyData();
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<RoadmapInput>({
    ...DEFAULT_FORM,
    subjects: subjects.map(s => s.name),
  });

  const [customSubject, setCustomSubject] = useState('');
  const [weakArea, setWeakArea] = useState('');
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // ── Subjects ──────────────────────────────────────────────────────────────
  const handleAddSubject = () => {
    const trimmed = customSubject.trim();
    if (trimmed && !formData.subjects.includes(trimmed)) {
      setFormData({ ...formData, subjects: [...formData.subjects, trimmed] });
      setCustomSubject('');
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData({ ...formData, subjects: formData.subjects.filter(s => s !== subject) });
  };

  // ── Weak areas ────────────────────────────────────────────────────────────
  const handleAddWeakArea = () => {
    if (weakArea.trim()) {
      setFormData({ ...formData, weakAreas: [...(formData.weakAreas ?? []), weakArea.trim()] });
      setWeakArea('');
    }
  };

  const handleRemoveWeakArea = (area: string) => {
    setFormData({ ...formData, weakAreas: formData.weakAreas?.filter(w => w !== area) ?? [] });
  };

  // ── Available study days toggle ───────────────────────────────────────────
  const toggleDay = (day: number) => {
    const days = formData.availableStudyDays ?? [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    setFormData({ ...formData, availableStudyDays: next });
  };

  // ── Neurodivergent sub-options ────────────────────────────────────────────
  const toggleNDOption = (key: keyof typeof DEFAULT_ND_OPTIONS, value: boolean) => {
    setFormData({
      ...formData,
      neurodivergentOptions: {
        ...(formData.neurodivergentOptions ?? DEFAULT_ND_OPTIONS),
        [key]: value,
      },
    });
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!formData.examDate) {
      toast.error('Please select your exam date');
      return;
    }
    if (formData.subjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }
    if ((formData.availableStudyDays ?? []).length === 0) {
      toast.error('Please select at least one available study day');
      return;
    }

    setIsGenerating(true);
    try {
      toast.info('AI is generating your personalised roadmap…', {
        description: 'This may take a few moments',
      });
      const roadmap = await generateStudyRoadmap(formData);
      setGeneratedRoadmap(roadmap);
      setShowSaveDialog(true);
      toast.success('Roadmap generated! 🎉', { description: 'Review your personalised study plan' });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate roadmap', { description: 'Please try again or check your API key' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveRoadmap = async () => {
    if (!generatedRoadmap) return;

    setShowSaveDialog(false);
    toast.info('Saving your roadmap…');
    try {
      await saveRoadmap(generatedRoadmap);
    } catch (error) {
      console.error('Error saving roadmap:', error);
      toast.error('Failed to save roadmap', { description: 'Check your connection and try again' });
      setShowSaveDialog(true); // re-open so user can retry
      return;
    }

    // Roadmap saved — now save subjects (non-blocking; failures are toasted individually)
    for (const [index, subjectName] of formData.subjects.entries()) {
      const subjectWeeks = generatedRoadmap.weeklyPlans.filter((week: any) =>
        week.focus.toLowerCase().includes(subjectName.toLowerCase()),
      );
      if (subjectWeeks.length > 0) {
        const examDate = formData.examDate || undefined;
        const newSubject = {
          name: subjectName,
          color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'][index % 5],
          ...(examDate ? { examDate } : {}),
          priority: 5 as const,
          chapters: subjectWeeks.map((week: any, weekIndex: number) => ({
            id: `chapter_${Date.now()}_${weekIndex}`,
            name: `Week ${week.week}: ${week.focus.split(' — ')[0] ?? week.focus}`,
            difficulty: weekIndex < subjectWeeks.length / 3 ? 'easy' as const
              : weekIndex < (2 * subjectWeeks.length) / 3 ? 'medium' as const
              : 'hard' as const,
            length: 'medium' as const,
            progress: 0,
            topics: week.topics.map((topic: string, topicIndex: number) => ({
              id: `topic_${Date.now()}_${weekIndex}_${topicIndex}`,
              name: topic,
              status: 'pending' as const,
              timeAllocated: Math.floor(
                ((week.studyHours ?? formData.studyHoursPerDay) / week.topics.length) * 60,
              ),
              timeSpent: 0,
            })),
          })),
        };
        await addSubject(newSubject);
      }
    }

    toast.success('Roadmap saved! 🎉', { description: 'Check your subjects and dashboard' });
    setTimeout(() => navigate('/dashboard'), 1500);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const ndOpts = formData.neurodivergentOptions ?? DEFAULT_ND_OPTIONS;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                AI Roadmap Generator
              </h1>
              <p className="text-sm text-muted-foreground">Create your personalised study plan</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Banner */}
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">AI-Powered Study Planning</h3>
                <p className="text-sm text-muted-foreground">
                  Provide your schedule, session preferences, and learning style. The AI will create a
                  week-by-week roadmap with concrete daily session blocks tailored to your needs.
                </p>
              </div>
            </div>
          </Card>

          {/* Form */}
          <Card className="p-6">
            <div className="space-y-8">

              {/* ── 1. Subjects ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">📚 Subjects</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a subject…"
                    value={customSubject}
                    onChange={e => setCustomSubject(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                  />
                  <Button onClick={handleAddSubject}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.subjects.map(subject => (
                    <div
                      key={subject}
                      className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full flex items-center gap-2"
                    >
                      <span className="text-sm font-medium">{subject}</span>
                      <button
                        onClick={() => handleRemoveSubject(subject)}
                        className="text-primary hover:text-primary/70"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* ── 2. Exam Date ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Exam Date
                </Label>
                <Input
                  type="date"
                  value={formData.examDate}
                  onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="border-t border-border" />

              {/* ── 3. Current Level ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Current Level
                </Label>
                <select
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  value={formData.currentLevel}
                  onChange={e => setFormData({ ...formData, currentLevel: e.target.value })}
                >
                  <option value="beginner">Beginner — Just starting out</option>
                  <option value="intermediate">Intermediate — Some knowledge</option>
                  <option value="advanced">Advanced — Strong foundation</option>
                </select>
              </div>

              <div className="border-t border-border" />

              {/* ── 4. Daily Study Hours ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Daily Study Hours: {formData.studyHoursPerDay}h
                </Label>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={formData.studyHoursPerDay}
                  onChange={e => setFormData({ ...formData, studyHoursPerDay: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>1 hour</span>
                  <span>12 hours</span>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* ── 5. Study Schedule ── */}
              <div>
                <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Study Schedule
                </Label>

                {/* Available days */}
                <div className="mb-5">
                  <p className="text-sm text-muted-foreground mb-3">Available study days</p>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_LABELS.map(({ label, value }) => {
                      const active = (formData.availableStudyDays ?? []).includes(value);
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleDay(value)}
                          className={`w-11 h-11 rounded-full text-sm font-semibold border transition-colors
                            ${active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:border-primary/50'
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {(formData.availableStudyDays ?? []).length === 0 && (
                    <p className="text-xs text-destructive mt-2">Select at least one day</p>
                  )}
                </div>

                {/* Preferred time window */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Preferred start time</p>
                    <Input
                      type="time"
                      value={formData.preferredStartTime}
                      onChange={e => setFormData({ ...formData, preferredStartTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Preferred end time</p>
                    <Input
                      type="time"
                      value={formData.preferredEndTime}
                      onChange={e => setFormData({ ...formData, preferredEndTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* ── 6. Session Settings ── */}
              <div>
                <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Session Settings
                </Label>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Session length</p>
                      <span className="text-sm font-semibold">{formData.sessionLengthMinutes} min</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="5"
                      value={formData.sessionLengthMinutes}
                      onChange={e =>
                        setFormData({ ...formData, sessionLengthMinutes: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>15 min</span>
                      <span>120 min</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Break between sessions</p>
                      <span className="text-sm font-semibold">{formData.breakLengthMinutes} min</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="5"
                      value={formData.breakLengthMinutes}
                      onChange={e =>
                        setFormData({ ...formData, breakLengthMinutes: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>5 min</span>
                      <span>30 min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* ── 7. Planning Options ── */}
              <div>
                <Label className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5" />
                  Planning Options
                </Label>

                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Exam Urgency */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Exam urgency</p>
                    <select
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                      value={formData.examUrgency}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          examUrgency: e.target.value as RoadmapInput['examUrgency'],
                        })
                      }
                    >
                      <option value="low">Low — Plenty of time</option>
                      <option value="medium">Medium — Steady pace</option>
                      <option value="high">High — Intensive push</option>
                    </select>
                  </div>

                  {/* Focus Preference */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Focus preference</p>
                    <select
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm"
                      value={formData.focusPreference}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          focusPreference: e.target.value as RoadmapInput['focusPreference'],
                        })
                      }
                    >
                      <option value="short">Short sprints</option>
                      <option value="long">Long deep-work</option>
                      <option value="mixed">Mixed (recommended)</option>
                    </select>
                  </div>

                  {/* Buffer Days */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Include buffer week</p>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, includeBufferDays: !formData.includeBufferDays })
                      }
                      className={`w-full px-3 py-2 rounded-md border text-sm font-medium transition-colors
                        ${formData.includeBufferDays
                          ? 'bg-success/10 border-success/40 text-success'
                          : 'bg-background border-input text-muted-foreground hover:border-primary/50'
                        }`}
                    >
                      {formData.includeBufferDays ? '✓ Enabled' : 'Disabled'}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Reserves the last week before your exam for catch-up
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* ── 8. Weak Areas ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">⚠️ Weak Areas (Optional)</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="e.g., Calculus, Organic Chemistry…"
                    value={weakArea}
                    onChange={e => setWeakArea(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddWeakArea()}
                  />
                  <Button onClick={handleAddWeakArea} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.weakAreas?.map(area => (
                    <div
                      key={area}
                      className="px-3 py-1 bg-warning/10 border border-warning/20 rounded-full flex items-center gap-2"
                    >
                      <span className="text-sm font-medium">{area}</span>
                      <button
                        onClick={() => handleRemoveWeakArea(area)}
                        className="text-warning hover:text-warning/70"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 9. Goals ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">🎯 Your Goals (Optional)</Label>
                <Textarea
                  placeholder="e.g., Score 90% in all subjects, improve problem-solving speed…"
                  value={formData.goals}
                  onChange={e => setFormData({ ...formData, goals: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="border-t border-border" />

              {/* ── 10. Neurodivergent Support ── */}
              <div className="rounded-xl border-2 border-purple-100 bg-purple-50/30 p-4">
                <Label className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Neurodivergent Support
                  <span className="text-xs font-normal text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Optional</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-1">
                  Adapts the roadmap and AI tips for ADHD, dyslexia, autism, or other learning differences.
                </p>
                <p className="text-xs text-purple-600 mb-4">
                  Enable this if you find standard timetables overwhelming or hard to follow.
                </p>

                {/* Main toggle */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.neurodivergentSupport}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        neurodivergentSupport: !formData.neurodivergentSupport,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none
                      ${formData.neurodivergentSupport ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform
                        ${formData.neurodivergentSupport ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                  <span className="text-sm font-medium">
                    {formData.neurodivergentSupport ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {/* Sub-options — shown only when enabled */}
                {formData.neurodivergentSupport && (
                  <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                    {(
                      [
                        { key: 'shorterSessions',    label: 'Shorter sessions', desc: 'Cap each session at 30 minutes' },
                        { key: 'extraBreaks',         label: 'Extra breaks',     desc: 'Minimum 15-minute breaks between sessions' },
                        { key: 'visualChecklist',     label: 'Visual checklist', desc: 'Goals written as tick-box steps' },
                        { key: 'flexibleCatchUp',     label: 'Flexible catch-up',desc: 'Buffer slot at the end of each week' },
                        { key: 'lowDistractionMode',  label: 'Low distraction',  desc: 'Tips for a distraction-free environment' },
                      ] as { key: keyof typeof DEFAULT_ND_OPTIONS; label: string; desc: string }[]
                    ).map(({ key, label, desc }) => (
                      <label key={key} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={ndOpts[key]}
                          onChange={e => toggleNDOption(key, e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                        />
                        <div>
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">
                            {label}
                          </p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Generate Button ── */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full gradient-primary text-white text-lg py-6 h-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Your Roadmap…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate AI Roadmap
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">Week-by-Week Plan</h4>
              <p className="text-sm text-muted-foreground">Detailed breakdown of what to study each week</p>
            </Card>
            <Card className="p-4">
              <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center mb-3">
                <Target className="h-5 w-5 text-success" />
              </div>
              <h4 className="font-semibold mb-1">Daily Session Blocks</h4>
              <p className="text-sm text-muted-foreground">Scheduled sessions based on your availability</p>
            </Card>
            <Card className="p-4">
              <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-info" />
              </div>
              <h4 className="font-semibold mb-1">Smart Tips</h4>
              <p className="text-sm text-muted-foreground">Study strategies tailored to your preferences</p>
            </Card>
          </div>
        </motion.div>

        {/* Save Dialog */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Sparkles className="h-6 w-6 text-primary" />
                Roadmap Generated Successfully!
              </DialogTitle>
              <DialogDescription>
                Your personalised study roadmap is ready. Would you like to save it?
              </DialogDescription>
            </DialogHeader>

            {generatedRoadmap && (
              <div className="py-4 space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-2">{generatedRoadmap.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{generatedRoadmap.description}</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">{generatedRoadmap.totalWeeks}</div>
                      <div className="text-xs text-muted-foreground">Weeks</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success">{formData.subjects.length}</div>
                      <div className="text-xs text-muted-foreground">Subjects</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-warning">
                        {generatedRoadmap.weeklyPlans.reduce((s: number, w: any) => s + w.topics.length, 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Topics</div>
                    </div>
                  </div>
                  {generatedRoadmap.suggestedSessions && generatedRoadmap.suggestedSessions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/10">
                      <p className="text-xs text-muted-foreground">
                        ✓ {generatedRoadmap.suggestedSessions.length} scheduled sessions generated
                        (starting {generatedRoadmap.suggestedSessions[0]?.date})
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-success/5 rounded-lg border border-success/20 space-y-1 text-sm">
                  <p><strong>✓ Saved to Dashboard:</strong> View your roadmap anytime</p>
                  <p><strong>✓ Added to My Subjects:</strong> Track progress per topic</p>
                  {formData.includeBufferDays && (
                    <p><strong>✓ Buffer Week Reserved:</strong> Last week kept for catch-up</p>
                  )}
                  {formData.neurodivergentSupport && (
                    <p><strong>✓ ND Adaptations Applied:</strong> Tips and pacing adjusted</p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveRoadmap} className="gradient-primary text-white">
                <Save className="h-4 w-4 mr-2" />
                Save Roadmap
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RoadmapGenerator;
