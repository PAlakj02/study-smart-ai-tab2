import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { generateStudyRoadmap, RoadmapInput } from '@/services/geminiService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Sparkles, Loader2, Zap, Target, Calendar, Clock, Save, CheckCircle, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

const RoadmapGenerator = () => {
  const navigate = useNavigate();
  const { setRoadmap, subjects, addSubject, addChapter } = useStudyData();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [formData, setFormData] = useState<RoadmapInput>({
    subjects: subjects.map(s => s.name),
    examDate: '',
    currentLevel: 'intermediate',
    studyHoursPerDay: 6,
    weakAreas: [],
    goals: '',
    preferredStudyStyle: 'mixed'
  });

  const [customSubject, setCustomSubject] = useState('');
  const [weakArea, setWeakArea] = useState('');

  const handleAddSubject = () => {
    if (customSubject.trim() && !formData.subjects.includes(customSubject.trim())) {
      setFormData({
        ...formData,
        subjects: [...formData.subjects, customSubject.trim()]
      });
      setCustomSubject('');
    }
  };

  const handleRemoveSubject = (subject: string) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter(s => s !== subject)
    });
  };

  const handleAddWeakArea = () => {
    if (weakArea.trim()) {
      setFormData({
        ...formData,
        weakAreas: [...(formData.weakAreas || []), weakArea.trim()]
      });
      setWeakArea('');
    }
  };

  const handleRemoveWeakArea = (area: string) => {
    setFormData({
      ...formData,
      weakAreas: formData.weakAreas?.filter(w => w !== area) || []
    });
  };

  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  const handleGenerate = async () => {
    if (!formData.examDate) {
      toast.error('Please select your exam date');
      return;
    }

    if (formData.subjects.length === 0) {
      toast.error('Please add at least one subject');
      return;
    }

    setIsGenerating(true);
    
    try {
      toast.info('AI is generating your personalized roadmap...', {
        description: 'This may take a few moments'
      });

      const roadmap = await generateStudyRoadmap(formData);
      setGeneratedRoadmap(roadmap);
      setShowSaveOptions(true);

      toast.success('Roadmap generated successfully! 🎉', {
        description: 'Review and save to your subjects'
      });
    } catch (error) {
      console.error('Error generating roadmap:', error);
      toast.error('Failed to generate roadmap', {
        description: 'Please try again or check your API key'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToDashboard = () => {
    setRoadmap(generatedRoadmap);
    toast.success('Saved to Dashboard!');
    setTimeout(() => navigate('/dashboard'), 1000);
  };

  const handleSaveToSubjects = () => {
    if (!generatedRoadmap) return;

    // For each subject in the roadmap, create subjects with chapters from weekly plans
    formData.subjects.forEach((subjectName, index) => {
      const subjectWeeks = generatedRoadmap.weeklyPlans.filter((week: any) => 
        week.focus.toLowerCase().includes(subjectName.toLowerCase())
      );

      if (subjectWeeks.length > 0) {
        // Create the subject
        const newSubject = {
          name: subjectName,
          color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500'][index % 5],
          examDate: formData.examDate,
          priority: 5,
          chapters: []
        };

        addSubject(newSubject);
        
        // Get the newly created subject ID (last one)
        setTimeout(() => {
          const allSubjects = subjects.filter(s => s.name === subjectName);
          if (allSubjects.length > 0) {
            const currentSubject = allSubjects[allSubjects.length - 1];
            
            // Group weeks into chapters
            subjectWeeks.forEach((week: any, weekIndex: number) => {
              const chapterName = `Week ${week.week}: ${week.focus.split(' - ')[0]}`;
              
              addChapter(currentSubject.id, {
                name: chapterName,
                difficulty: weekIndex < subjectWeeks.length / 3 ? 'easy' : weekIndex < 2 * subjectWeeks.length / 3 ? 'medium' : 'hard',
                length: 'medium',
                topics: week.topics.map((topic: string) => ({
                  name: topic,
                  status: 'pending' as const,
                  timeAllocated: Math.floor(week.studyHours / week.topics.length * 60),
                  timeSpent: 0
                }))
              });
            });
          }
        }, 100);
      }
    });

    // Also save to dashboard
    setRoadmap(generatedRoadmap);
    
    toast.success('Roadmap saved to My Subjects! 🎉', {
      description: 'You can now track your progress'
    });

    setTimeout(() => navigate('/subjects'), 1500);
  };

  const handleSaveBoth = () => {
    handleSaveToSubjects();
  };

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
                  <Sparkles className="h-6 w-6 text-primary" />
                  AI Roadmap Generator
                </h1>
                <p className="text-sm text-muted-foreground">Create your personalized study plan</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Info Banner */}
          <Card className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">AI-Powered Study Planning</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI will analyze your inputs and create a week-by-week study roadmap tailored to your needs,
                  learning style, and exam schedule. Get specific topics, goals, and strategies for each week!
                </p>
              </div>
            </div>
          </Card>

          {/* Form */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Subjects */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">📚 Subjects</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Add a subject..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                  />
                  <Button onClick={handleAddSubject}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.subjects.map((subject) => (
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

              {/* Exam Date */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Exam Date
                </Label>
                <Input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Current Level */}
              <div>
                <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Current Level
                </Label>
                <select
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  value={formData.currentLevel}
                  onChange={(e) => setFormData({ ...formData, currentLevel: e.target.value })}
                >
                  <option value="beginner">Beginner - Just starting</option>
                  <option value="intermediate">Intermediate - Some knowledge</option>
                  <option value="advanced">Advanced - Strong foundation</option>
                </select>
              </div>

              {/* Study Hours */}
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
                  onChange={(e) => setFormData({ ...formData, studyHoursPerDay: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>1 hour</span>
                  <span>12 hours</span>
                </div>
              </div>

              {/* Weak Areas */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">⚠️ Weak Areas (Optional)</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="e.g., Calculus, Organic Chemistry..."
                    value={weakArea}
                    onChange={(e) => setWeakArea(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddWeakArea()}
                  />
                  <Button onClick={handleAddWeakArea} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.weakAreas?.map((area) => (
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

              {/* Study Style */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">📖 Preferred Study Style</Label>
                <select
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                  value={formData.preferredStudyStyle}
                  onChange={(e) => setFormData({ ...formData, preferredStudyStyle: e.target.value })}
                >
                  <option value="visual">Visual - Videos, diagrams, charts</option>
                  <option value="reading">Reading - Books, notes, articles</option>
                  <option value="practical">Practical - Problem-solving, exercises</option>
                  <option value="mixed">Mixed - Combination of all</option>
                </select>
              </div>

              {/* Goals */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">🎯 Your Goals (Optional)</Label>
                <Textarea
                  placeholder="e.g., Score 90% in all subjects, Focus on problem-solving speed..."
                  value={formData.goals}
                  onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full gradient-primary text-white text-lg py-6 h-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating Your Roadmap...
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

          {/* Features */}
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
              <h4 className="font-semibold mb-1">Clear Goals</h4>
              <p className="text-sm text-muted-foreground">Specific, achievable goals for each week</p>
            </Card>
            <Card className="p-4">
              <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-info" />
              </div>
              <h4 className="font-semibold mb-1">Smart Tips</h4>
              <p className="text-sm text-muted-foreground">Study strategies and time management tips</p>
            </Card>
          </div>
        </motion.div>

        {/* Save Options Dialog */}
        <Dialog open={showSaveOptions} onOpenChange={setShowSaveOptions}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-success" />
                Roadmap Generated Successfully!
              </DialogTitle>
              <DialogDescription>
                Choose how you want to save your personalized study roadmap
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <Button 
                onClick={handleSaveToDashboard}
                variant="outline"
                className="w-full h-auto p-4 justify-start"
              >
                <div className="flex items-start gap-3 text-left">
                  <Save className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Save to Dashboard Only</div>
                    <div className="text-sm text-muted-foreground">
                      View your roadmap on dashboard. Manual topic management.
                    </div>
                  </div>
                </div>
              </Button>

              <Button 
                onClick={handleSaveToSubjects}
                className="w-full h-auto p-4 justify-start gradient-primary text-white"
              >
                <div className="flex items-start gap-3 text-left">
                  <FolderPlus className="h-5 w-5 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold mb-1">Save to My Subjects (Recommended)</div>
                    <div className="text-sm opacity-90">
                      Automatically create subjects with all topics. Track completion easily!
                    </div>
                  </div>
                </div>
              </Button>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center">
                  💡 Saving to My Subjects creates organized chapters and topics you can check off as you complete them
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default RoadmapGenerator;

