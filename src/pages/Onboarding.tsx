import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    board: "",
    subjects: [] as string[],
    dailyHours: 4,
    availableDays: [1, 2, 3, 4, 5],
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding
      toast.success("Generating your personalized timetable!", {
        description: "This will take just a moment..."
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Let's Get Started! 👋</h2>
              <p className="text-muted-foreground">Tell us a bit about yourself</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="Alex Johnson"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="grade">Grade / Class</Label>
                <select
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                >
                  <option value="">Select your grade</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                  <option value="college">College</option>
                </select>
              </div>

              <div>
                <Label htmlFor="board">Board / Curriculum</Label>
                <select
                  id="board"
                  value={formData.board}
                  onChange={(e) => setFormData({ ...formData, board: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                >
                  <option value="">Select your board</option>
                  <option value="cbse">CBSE</option>
                  <option value="icse">ICSE</option>
                  <option value="igcse">IGCSE</option>
                  <option value="ib">IB</option>
                  <option value="state">State Board</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Your Subjects 📚</h2>
              <p className="text-muted-foreground">What will you be studying?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science'].map((subject) => (
                <Button
                  key={subject}
                  variant={formData.subjects.includes(subject) ? "default" : "outline"}
                  className={formData.subjects.includes(subject) ? "gradient-primary text-white" : ""}
                  onClick={() => {
                    if (formData.subjects.includes(subject)) {
                      setFormData({
                        ...formData,
                        subjects: formData.subjects.filter(s => s !== subject)
                      });
                    } else {
                      setFormData({
                        ...formData,
                        subjects: [...formData.subjects, subject]
                      });
                    }
                  }}
                >
                  {subject}
                </Button>
              ))}
            </div>

            <div className="pt-4">
              <Input
                placeholder="Add custom subject..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    setFormData({
                      ...formData,
                      subjects: [...formData.subjects, e.currentTarget.value]
                    });
                    e.currentTarget.value = '';
                  }
                }}
              />
              <p className="text-sm text-muted-foreground mt-2">Press Enter to add</p>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Exam Schedule 📅</h2>
              <p className="text-muted-foreground">When are your exams?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Exam Period</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="exam-start" className="text-sm text-muted-foreground">Start Date</Label>
                    <Input id="exam-start" type="date" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="exam-end" className="text-sm text-muted-foreground">End Date</Label>
                    <Input id="exam-end" type="date" className="mt-1" />
                  </div>
                </div>
              </div>

              <Card className="p-4 bg-primary/5 border-primary/20">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Tip:</strong> We'll automatically distribute your study time based on exam dates
                </p>
              </Card>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Study Availability ⏰</h2>
              <p className="text-muted-foreground">When can you study?</p>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Daily Study Hours</Label>
                  <span className="text-lg font-semibold text-primary">{formData.dailyHours}h</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={formData.dailyHours}
                  onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>1h</span>
                  <span>12h</span>
                </div>
              </div>

              <div>
                <Label className="mb-3 block">Available Days</Label>
                <div className="grid grid-cols-7 gap-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                    <Button
                      key={day}
                      variant={formData.availableDays.includes(index + 1) ? "default" : "outline"}
                      className={`aspect-square p-0 ${formData.availableDays.includes(index + 1) ? 'gradient-primary text-white' : ''}`}
                      onClick={() => {
                        if (formData.availableDays.includes(index + 1)) {
                          setFormData({
                            ...formData,
                            availableDays: formData.availableDays.filter(d => d !== index + 1)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            availableDays: [...formData.availableDays, index + 1].sort()
                          });
                        }
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>

              <Card className={`p-4 ${formData.dailyHours >= 6 ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30'}`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${formData.dailyHours >= 6 ? 'bg-success' : 'bg-warning'}`} />
                  <span className="text-sm font-medium">
                    {formData.dailyHours >= 6 ? 'Great commitment!' : 'Consider adding more hours for better results'}
                  </span>
                </div>
              </Card>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Review & Generate ✨</h2>
              <p className="text-muted-foreground">Everything looks good?</p>
            </div>

            <Card className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{formData.name || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Grade</span>
                <span className="font-medium">{formData.grade || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subjects</span>
                <span className="font-medium">{formData.subjects.length} subjects</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Study Hours</span>
                <span className="font-medium">{formData.dailyHours} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Study Days</span>
                <span className="font-medium">{formData.availableDays.length} days/week</span>
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">AI will create your personalized timetable</p>
                  <p className="text-sm text-muted-foreground">
                    Based on your inputs, we'll generate an optimized study schedule that adapts to your needs
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="p-8 md:p-12">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Step {step} of {totalSteps}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className={`${step === 1 ? 'w-full' : 'flex-1'} gradient-primary text-white`}
            >
              {step === totalSteps ? 'Generate Timetable' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
