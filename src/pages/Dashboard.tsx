import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Flame,
  BookOpen,
  TrendingUp,
  Settings,
  Bell,
  User,
  Target,
  Play
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const todaySessions = [
    { id: 1, subject: 'Mathematics', topic: 'Calculus - Derivatives', time: '9:00 AM', duration: 60, status: 'completed', color: 'bg-blue-500' },
    { id: 2, subject: 'Physics', topic: 'Mechanics - Motion', time: '10:30 AM', duration: 45, status: 'current', color: 'bg-purple-500' },
    { id: 3, subject: 'Chemistry', topic: 'Organic Chemistry', time: '2:00 PM', duration: 60, status: 'upcoming', color: 'bg-green-500' },
    { id: 4, subject: 'English', topic: 'Literature Analysis', time: '4:00 PM', duration: 45, status: 'upcoming', color: 'bg-orange-500' },
  ];

  const subjects = [
    { name: 'Mathematics', progress: 75, color: 'bg-blue-500' },
    { name: 'Physics', progress: 60, color: 'bg-purple-500' },
    { name: 'Chemistry', progress: 45, color: 'bg-green-500' },
    { name: 'English', progress: 80, color: 'bg-orange-500' },
  ];

  const upcomingExams = [
    { subject: 'Mathematics', date: 'Dec 15, 2024', daysLeft: 23, status: 'on-track' },
    { subject: 'Physics', date: 'Dec 18, 2024', daysLeft: 26, status: 'on-track' },
    { subject: 'Chemistry', date: 'Dec 20, 2024', daysLeft: 28, status: 'needs-attention' },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gradient">StudySync</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold">Good Morning, Alex! 👋</h2>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Flame className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">7-day Streak</span>
            </div>
          </div>
          <p className="text-muted-foreground">Let's make today productive!</p>
        </motion.div>

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
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Today's Schedule</h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/timetable')}>
                  View All
                </Button>
              </div>

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
                        {session.status === 'current' && (
                          <Button 
                            size="sm" 
                            className="mt-2 gradient-primary text-white"
                            onClick={() => navigate('/study-session')}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Session
                          </Button>
                        )}
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
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - 0.65)}`}
                      className="transition-all duration-1000"
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
                      <p className="text-3xl font-bold text-gradient">65%</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Days Left</span>
                    <span className="font-semibold">23 days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hours Completed</span>
                    <span className="font-semibold">142 / 180h</span>
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
                    <BookOpen className="h-4 w-4 mr-2" />
                    Study Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate('/timetable')}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    View Timetable
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Add Topic
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Subject Progress */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6">Subject Progress</h3>
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.name}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-sm text-muted-foreground">{subject.progress}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.progress}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={`absolute h-full ${subject.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Upcoming Exams */}
          <motion.div variants={item}>
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Upcoming Exams</h3>
              </div>
              <div className="space-y-3">
                {upcomingExams.map((exam) => (
                  <div key={exam.subject} className="p-3 rounded-lg border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{exam.subject}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exam.status === 'on-track' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {exam.status === 'on-track' ? 'On Track' : 'Needs Attention'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{exam.date}</p>
                    <p className="text-sm font-medium text-primary">{exam.daysLeft} days left</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
