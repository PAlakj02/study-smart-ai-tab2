import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { generateStudyRoadmap, RoadmapInput, StudyRoadmap } from '@/services/geminiService';
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
  AlertTriangle,
  CheckCircle2,
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

// Form-level state omits subjectId/topicTags/subjects — subject selection and its
// topics are resolved per-subject at generate time from the user's real syllabus.
type RoadmapFormData = Omit<RoadmapInput, 'subjectId' | 'topicTags' | 'subjects'>;

const DEFAULT_FORM: RoadmapFormData = {
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
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
  const [searchParams] = useSearchParams();
  const { saveRoadmap, subjects, updateSubject } = useStudyData();
  const [isGenerating, setIsGenerating] = useState(false);

  const [formData, setFormData] = useState<RoadmapFormData>({ ...DEFAULT_FORM });

  // Which existing subjects to generate a roadmap for — topics come from each
  // subject's own syllabus (added in My Subjects), never typed here.
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [weakArea, setWeakArea] = useState('');
  const [generatedRoadmaps, setGeneratedRoadmaps] = useState<StudyRoadmap[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Pre-select a subject when arriving via a "Generate roadmap" link (?subjectId=...)
  useEffect(() => {
    const preselect = searchParams.get('subjectId');
    if (preselect && subjects.some(s => s.id === preselect)) {
      setSelectedSubjectIds(prev => new Set(prev).add(preselect));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, subjects.length]);

  const subjectTopics = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return [];
    return subject.chapters.flatMap(c => c.topics);
  };

  const toggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(subjectId)) next.delete(subjectId);
      else next.add(subjectId);
      return next;
    });
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
    if (!formData.endDate) {
      toast.error('Please select when your study schedule should end');
      return;
    }
    if (formData.startDate && formData.endDate <= formData.startDate) {
      toast.error('End date must be after the start date');
      return;
    }
    if (!formData.examDate) {
      toast.error('Please select your exam date');
      return;
    }
    if (formData.startDate && formData.examDate <= formData.startDate) {
      toast.error('Exam date must be after the start date');
      return;
    }
    if (selectedSubjectIds.size === 0) {
      toast.error('Please select at least one subject');
      return;
    }
    if ((formData.availableStudyDays ?? []).length === 0) {
      toast.error('Please select at least one available study day');
      return;
    }

    // The AI only ever schedules topics the user has actually defined — never
    // generic filler. Subjects with no topics yet are skipped, not padded out.
    const selected = subjects.filter(s => selectedSubjectIds.has(s.id));
    const ready = selected.filter(s => subjectTopics(s.id).length > 0);
    const skipped = selected.filter(s => subjectTopics(s.id).length === 0);

    if (skipped.length > 0) {
      toast.error(
        skipped.length === selected.length
          ? 'None of the selected subjects have topics yet'
          : `Skipping ${skipped.map(s => s.name).join(', ')} — no topics yet`,
        { description: 'Add topics in My Subjects before generating a roadmap for them' },
      );
    }
    if (ready.length === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      toast.info('AI is generating your personalised roadmap(s)…', {
        description: 'This may take a few moments',
      });

      // One roadmap per subject, scheduling exactly that subject's own topics.
      // topicTags carries plain topic names only (shown verbatim in the UI);
      // topicDetails carries the same names plus description + stable topicId,
      // used for AI prompt context and for ID-based progress matching later.
      const results: StudyRoadmap[] = [];
      for (const subject of ready) {
        const topics = subjectTopics(subject.id);
        const topicTags = topics.map(t => t.name);
        const topicDetails = topics.map(t => ({ name: t.name, description: t.notes, topicId: t.id }));
        const perSubjectInput: RoadmapInput = {
          ...formData,
          subjects: [subject.name],
          subjectId: subject.id,
          topicTags,
          topicDetails,
        };
        const generated = await generateStudyRoadmap(perSubjectInput);
        results.push({ ...generated, subjectId: subject.id, subjectName: subject.name });
      }

      setGeneratedRoadmaps(results);
      setShowSaveDialog(true);
      toast.success('Roadmap generated! 🎉', {
        description: `${results.length} subject plan${results.length > 1 ? 's' : ''} ready to review`,
      });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate roadmap', { description: 'Please try again or check your API key' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSaveRoadmap = async () => {
    if (generatedRoadmaps.length === 0) return;

    setShowSaveDialog(false);
    toast.info('Saving your roadmap(s)…');
    try {
      for (const rm of generatedRoadmaps) {
        await saveRoadmap(rm);
      }
    } catch (error) {
      console.error('Error saving roadmap:', error);
      toast.error('Failed to save roadmap', { description: 'Check your connection and try again' });
      setShowSaveDialog(true); // re-open so user can retry
      return;
    }

    // Roadmaps saved — subjects and their topics are the user's own syllabus and
    // are never touched here; only the exam date gets patched onto each subject.
    const examDate = formData.examDate || undefined;
    if (examDate) {
      for (const rm of generatedRoadmaps) {
        const existingSubject = subjects.find(s => s.id === rm.subjectId);
        if (existingSubject && existingSubject.examDate !== examDate) {
          await updateSubject(existingSubject.id, { examDate });
        }
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
                <p className="text-sm text-muted-foreground mb-3">
                  Pick which subjects to generate a roadmap for. The AI schedules exactly the topics
                  you've added to each subject in My Subjects — nothing invented, nothing skipped.
                </p>

                {subjects.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border text-center">
                    <p className="text-sm text-muted-foreground mb-3">You don't have any subjects yet.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/subjects')}>
                      Add a subject
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subjects.map(subject => {
                      const topics = subjectTopics(subject.id);
                      const selected = selectedSubjectIds.has(subject.id);
                      return (
                        <div
                          key={subject.id}
                          className={`p-3 rounded-lg border transition-colors ${
                            selected ? 'border-primary/40 bg-primary/5' : 'border-border'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleSubjectSelection(subject.id)}
                              className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className={`h-2.5 w-2.5 rounded-full ${subject.color}`} />
                                <span className="font-medium">{subject.name}</span>
                                {topics.length > 0 ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> {topics.length} topic{topics.length > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/10 text-warning flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" /> No topics yet
                                  </span>
                                )}
                              </div>
                              {topics.length === 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); navigate(`/subjects`); }}
                                  className="text-xs text-primary hover:underline mt-1"
                                >
                                  Add topics for this subject first →
                                </button>
                              ) : selected && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {topics.map(t => (
                                    <span
                                      key={t.id}
                                      className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                      title={t.notes || undefined}
                                    >
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* ── 2. Start Date, End Date & Exam Date ── */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Roadmap Dates
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Start date</p>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      max={formData.endDate || formData.examDate || undefined}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">End date</p>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">When the study schedule finishes</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Exam date</p>
                    <Input
                      type="date"
                      value={formData.examDate}
                      onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-muted-foreground mt-1">The actual exam — may be after the schedule ends</p>
                  </div>
                </div>
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
                {generatedRoadmaps.length > 1
                  ? `${generatedRoadmaps.length} personalised study roadmaps are ready. Would you like to save them?`
                  : 'Your personalised study roadmap is ready. Would you like to save it?'}
              </DialogDescription>
            </DialogHeader>

            {generatedRoadmaps.length > 0 && (
              <div className="py-4 space-y-3 max-h-[50vh] overflow-y-auto">
                {generatedRoadmaps.map(rm => (
                  <div key={rm.subjectId} className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <h3 className="font-semibold mb-1">{rm.subjectName}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{rm.title}</p>
                    <p className="text-sm text-muted-foreground mb-3">{rm.description}</p>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">{rm.totalWeeks}</div>
                        <div className="text-xs text-muted-foreground">Weeks</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-success">{rm.startDate} → {rm.endDate}</div>
                        <div className="text-xs text-muted-foreground">Date range</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-warning">
                          {rm.weeklyPlans.reduce((s, w) => s + w.topics.length, 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Topics</div>
                      </div>
                    </div>
                    {rm.examDate && (
                      <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-primary/10">
                        🎯 Exam date: <span className="font-medium text-foreground">{rm.examDate}</span>
                        {rm.examDate > rm.endDate ? ' (after the study window ends)' : ''}
                      </p>
                    )}
                    {rm.suggestedSessions && rm.suggestedSessions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-primary/10">
                        <p className="text-xs text-muted-foreground">
                          ✓ {rm.suggestedSessions.length} scheduled sessions generated
                          (starting {rm.suggestedSessions[0]?.date})
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                <div className="p-3 bg-success/5 rounded-lg border border-success/20 space-y-1 text-sm">
                  <p><strong>✓ Saved to Dashboard:</strong> One card per subject, anytime</p>
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
