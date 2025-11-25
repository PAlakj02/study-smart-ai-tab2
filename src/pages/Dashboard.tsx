import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useStudyData } from "@/context/StudyDataContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  Settings,
  User,
  Target,
  Play,
  LogOut,
  Plus,
  BarChart3,
  BookMarked,
  Sparkles,
  Timer
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { subjects, totalStudyHours, roadmap, loading } = useStudyData();

  // Generate today's study schedule from subjects and roadmap
  const todaySessions = React.useMemo(() => {
    const sessions: any[] = [];
    
    // If roadmap exists, use current week's topics
    if (roadmap && roadmap.weeklyPlans) {
      const currentWeekIndex = Math.min(
        Math.floor((new Date().getTime() - new Date(roadmap.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)),
        roadmap.weeklyPlans.length - 1
      );
      
      const currentWeek = roadmap.weeklyPlans[currentWeekIndex];
      
      if (currentWeek && currentWeek.topics) {
        const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
        currentWeek.topics.slice(0, 4).forEach((topic: string, index: number) => {
          const subject = subjects.find(s => 
            currentWeek.focus.toLowerCase().includes(s.name.toLowerCase())
          ) || subjects[0];
          
          sessions.push({
            id: index + 1,
            subject: subject?.name || 'Study',
            topic: topic,
            time: times[index],
            duration: 60,
            status: index === 0 ? 'current' : index < 2 ? 'upcoming' : 'pending',
            color: subject?.color || 'bg-primary'
          });
        });
      }
    }
    
    // If no roadmap, create sessions from subjects with pending topics
    if (sessions.length === 0 && subjects.length > 0) {
      const times = ['9:00 AM', '11:00 AM', '2:00 PM', '4:00 PM'];
      let sessionCount = 0;
      
      for (const subject of subjects) {
        if (sessionCount >= 4) break;
        
        for (const chapter of subject.chapters) {
          if (sessionCount >= 4) break;
          
          const pendingTopics = chapter.topics.filter(t => t.status === 'pending' || t.status === 'in-progress');
          
          for (const topic of pendingTopics.slice(0, 1)) {
            sessions.push({
              id: sessionCount + 1,
              subject: subject.name,
              topic: `${chapter.name}: ${topic.name}`,
              time: times[sessionCount],
              duration: topic.timeAllocated || 60,
              status: sessionCount === 0 ? 'current' : 'upcoming',
              color: subject.color
            });
            sessionCount++;
            if (sessionCount >= 4) break;
          }
        }
      }
    }
    
    return sessions;
  }, [subjects, roadmap]);

  const upcomingExams = subjects
    .filter(s => s.examDate)
    .map(s => ({
      subject: s.name,
      date: new Date(s.examDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysLeft: Math.ceil((new Date(s.examDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      status: s.progress >= 60 ? 'on-track' : 'needs-attention',
      color: s.color
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const overallProgress = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gradient">StudySync</h1>
              <div className="hidden md:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/roadmap')}>
                  AI Roadmap
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/subjects')}>
                  My Subjects
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
                  Analytics
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/study-session')}
                title="Pomodoro Timer"
              >
                <Timer className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
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
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-3xl font-bold">Good Morning, {user?.name || 'Student'}! 👋</h2>
              <p className="text-muted-foreground">Let's make today productive!</p>
            </div>
            <Button onClick={() => navigate('/subjects')} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Topics
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStudyHours}h</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.length}</p>
                  <p className="text-xs text-muted-foreground">Subjects</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subjects.reduce((acc, s) => acc + s.completedTopics, 0)}</p>
                  <p className="text-xs text-muted-foreground">Topics Done</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallProgress}%</p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* AI Roadmap Section */}
        {roadmap && subjects.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full gradient-primary flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{roadmap.title}</h3>
                    <p className="text-sm text-muted-foreground">{roadmap.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/roadmap')}>
                  Update
                </Button>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Weeks</div>
                  <div className="text-2xl font-bold text-primary">{roadmap.totalWeeks}</div>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Week</div>
                  <div className="text-2xl font-bold text-success">
                    Week {Math.min(Math.ceil((new Date().getTime() - new Date(roadmap.createdAt).getTime()) / (7 * 24 * 60 * 60 * 1000)), roadmap.totalWeeks)}
                  </div>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Study Tips</div>
                  <div className="text-2xl font-bold">{roadmap.tips.length}</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">This Week's Focus</h4>
                {roadmap.weeklyPlans[0] && (
                  <div className="p-3 bg-background rounded-lg">
                    <p className="font-medium text-primary mb-2">{roadmap.weeklyPlans[0].focus}</p>
                    <div className="space-y-1">
                      {roadmap.weeklyPlans[0].topics.slice(0, 3).map((topic, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Target className="h-3 w-3 text-muted-foreground" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="p-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Generate Your AI Study Roadmap</h3>
                <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                  Let our AI create a personalized week-by-week study plan tailored to your subjects, exam dates, and learning style.
                </p>
                <Button onClick={() => navigate('/roadmap')} className="gradient-primary text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Roadmap Now
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Dashboard Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Today's Schedule - Large Card */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Today's Schedule</h3>
                </div>

              {todaySessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No study sessions scheduled for today</p>
              </div>
              ) : (
              <div className="space-y-3">
                {todaySessions.map((session, index) => (
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
                        {session.status === 'completed' && (
                          <div className="flex items-center gap-2 mt-2 text-success">
                            <div className="h-2 w-2 rounded-full bg-success" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              )}
            </Card>
          </motion.div>

          {/* Right Column */}
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
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-muted"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
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
                      {subjects.reduce((acc, s) => acc + s.completedTopics, 0)} / {subjects.reduce((acc, s) => acc + s.totalTopics, 0)}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={item}>
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/study-session')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Pomodoro Timer
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/subjects')}
                  >
                    <BookMarked className="h-4 w-4 mr-2" />
                    My Subjects
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/analytics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Subject Progress */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Subject Progress</h3>
                <Button size="sm" variant="outline" onClick={() => navigate('/subjects')}>
                  Manage
                </Button>
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
                {subjects.map((subject) => (
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
                {upcomingExams.map((exam) => (
                    <div key={exam.subject} className="p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${exam.color}`} />
                      <h4 className="font-semibold">{exam.subject}</h4>
                        </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exam.status === 'on-track' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {exam.status === 'on-track' ? 'On Track' : 'Needs Attention'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{exam.date}</p>
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${
                          exam.daysLeft < 7 ? 'text-destructive' :
                          exam.daysLeft < 14 ? 'text-warning' :
                          'text-primary'
                        }`}>
                          {exam.daysLeft} days left
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => navigate('/study-session')}>
                          Study
                        </Button>
                      </div>
                  </div>
                ))}
              </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
        </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
