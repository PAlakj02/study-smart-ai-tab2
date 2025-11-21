import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Pause, Play, SkipForward, CheckCircle, FileText, Music } from "lucide-react";
import { toast } from "sonner";

const StudySession = () => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [notes, setNotes] = useState("");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const totalTime = 45 * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    setIsComplete(true);
    toast.success("Session Complete! 🎉", {
      description: "Great work! You've completed this study session."
    });
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="h-20 w-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="h-10 w-10 text-white" />
            </motion.div>
            
            <h2 className="text-3xl font-bold mb-2">Session Complete!</h2>
            <p className="text-muted-foreground mb-6">Great work on completing your study session</p>
            
            <div className="space-y-3 mb-8">
              <div className="flex justify-between p-3 bg-surface rounded-lg">
                <span className="text-muted-foreground">Time Studied</span>
                <span className="font-semibold">45 min</span>
              </div>
              <div className="flex justify-between p-3 bg-surface rounded-lg">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold text-success">+12%</span>
              </div>
              <div className="flex justify-between p-3 bg-surface rounded-lg">
                <span className="text-muted-foreground">Streak</span>
                <span className="font-semibold flex items-center gap-1">
                  <span>7 days</span>
                  <span>🔥</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                className="w-full gradient-primary text-white"
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setIsComplete(false);
                  setTimeLeft(45 * 60);
                }}
              >
                Start Next Session
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 h-64 w-64 rounded-full gradient-primary blur-3xl animate-float" />
        <div className="absolute bottom-20 right-20 h-64 w-64 rounded-full gradient-hero blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h1 className="text-lg font-semibold">Study Session</h1>
              <p className="text-sm text-muted-foreground">Mathematics - Calculus</p>
            </div>
            <div className="w-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Timer Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <Card className="p-12 relative overflow-hidden">
              <div className="absolute inset-0 gradient-primary opacity-5" />
              
              <div className="relative z-10">
                <h3 className="text-xl font-semibold mb-2 text-muted-foreground">Derivatives</h3>
                
                {/* Circular Progress */}
                <div className="relative w-64 h-64 mx-auto my-8">
                  <svg className="transform -rotate-90 w-64 h-64">
                    <circle
                      cx="128"
                      cy="128"
                      r="120"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted/20"
                    />
                    <motion.circle
                      cx="128"
                      cy="128"
                      r="120"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 120}`}
                      strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                      className="transition-all duration-300"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="hsl(239, 84%, 67%)" />
                        <stop offset="100%" stopColor="hsl(258, 90%, 66%)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-6xl font-bold font-mono">{formatTime(timeLeft)}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {Math.round(progress)}% Complete
                      </p>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-4 justify-center mb-6">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setIsRunning(!isRunning)}
                    className="h-14 w-14 p-0 rounded-full"
                  >
                    {isRunning ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      toast.info("Session skipped");
                      navigate('/dashboard');
                    }}
                    className="h-14 px-6 rounded-full"
                  >
                    <SkipForward className="h-5 w-5 mr-2" />
                    Skip
                  </Button>
                  <Button
                    size="lg"
                    className="h-14 px-8 rounded-full gradient-primary text-white"
                    onClick={handleComplete}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete
                  </Button>
                </div>

                {/* Music Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMusicEnabled(!musicEnabled)}
                  className={musicEnabled ? "text-primary" : ""}
                >
                  <Music className="h-4 w-4 mr-2" />
                  Focus Music: {musicEnabled ? "On" : "Off"}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Quick Notes */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Quick Notes</h3>
              </div>
              <Textarea
                placeholder="Jot down important points, formulas, or thoughts..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[120px] resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">Auto-saved</p>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default StudySession;
