import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Clock, Target, AlertCircle, Calendar, Award, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const { subjects, streak, totalStudyHours } = useStudyData();

  // Calculate analytics data
  const weeklyStudyData = [
    { day: 'Mon', hours: 5.5 },
    { day: 'Tue', hours: 6.2 },
    { day: 'Wed', hours: 4.8 },
    { day: 'Thu', hours: 7.1 },
    { day: 'Fri', hours: 5.9 },
    { day: 'Sat', hours: 6.5 },
    { day: 'Sun', hours: 4.2 }
  ];

  const subjectDistribution = subjects.map(s => ({
    name: s.name,
    value: s.completedTopics,
    color: s.color
  }));

  const progressTrend = [
    { week: 'Week 1', progress: 25 },
    { week: 'Week 2', progress: 42 },
    { week: 'Week 3', progress: 58 },
    { week: 'Week 4', progress: 65 }
  ];

  const weakSubjects = subjects
    .filter(s => s.progress < 50)
    .sort((a, b) => a.progress - b.progress);

  const strongSubjects = subjects
    .filter(s => s.progress >= 70)
    .sort((a, b) => b.progress - a.progress);

  const upcomingExams = subjects
    .filter(s => s.examDate)
    .sort((a, b) => new Date(a.examDate!).getTime() - new Date(b.examDate!).getTime())
    .slice(0, 3);

  const totalWeeklyHours = weeklyStudyData.reduce((acc, day) => acc + day.hours, 0);
  const avgDailyHours = (totalWeeklyHours / 7).toFixed(1);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#ec4899'];

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
                <h1 className="text-2xl font-bold">Analytics & Insights</h1>
                <p className="text-sm text-muted-foreground">Track your progress and performance</p>
              </div>
            </div>
            <Button className="gradient-primary text-white">
              <Calendar className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Study Hours</p>
              <p className="text-3xl font-bold text-gradient">{totalStudyHours}h</p>
              <p className="text-xs text-muted-foreground mt-2">
                +{totalWeeklyHours.toFixed(1)}h this week
              </p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-warning/20 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
              <p className="text-3xl font-bold">{streak} days</p>
              <p className="text-xs text-success mt-2">Keep it up! 🔥</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-success/20 flex items-center justify-center">
                  <Target className="h-6 w-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Avg. Daily Hours</p>
              <p className="text-3xl font-bold">{avgDailyHours}h</p>
              <p className="text-xs text-muted-foreground mt-2">This week</p>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-12 w-12 rounded-lg bg-info/20 flex items-center justify-center">
                  <Award className="h-6 w-6 text-info" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Overall Progress</p>
              <p className="text-3xl font-bold">65%</p>
              <p className="text-xs text-muted-foreground mt-2">All subjects</p>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weekly Study Hours */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Weekly Study Hours</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyStudyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="hours" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(186, 94%, 55%)" />
                      <stop offset="100%" stopColor="hsl(231, 48%, 48%)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Subject Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Topics Completed by Subject</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Progress Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6">Progress Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={progressTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="progress"
                  stroke="hsl(186, 94%, 55%)"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(186, 94%, 55%)', r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subjects Needing Attention */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Needs Attention</h3>
              </div>
              {weakSubjects.length > 0 ? (
                <div className="space-y-3">
                  {weakSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded ${subject.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {subject.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subject.completedTopics}/{subject.totalTopics} topics
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-warning">{subject.progress}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Great! All subjects are on track 🎉
                </p>
              )}
            </Card>
          </motion.div>

          {/* Strong Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Strong Performance</h3>
              </div>
              {strongSubjects.length > 0 ? (
                <div className="space-y-3">
                  {strongSubjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-success/5 border border-success/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded ${subject.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {subject.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {subject.completedTopics}/{subject.totalTopics} topics
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-success">{subject.progress}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keep studying to see your strong subjects here!
                </p>
              )}
            </Card>
          </motion.div>

          {/* Upcoming Exams */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Upcoming Exams</h3>
              </div>
              {upcomingExams.length > 0 ? (
                <div className="space-y-3">
                  {upcomingExams.map((subject) => {
                    const daysLeft = Math.ceil(
                      (new Date(subject.examDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div key={subject.id} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{subject.name}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            daysLeft < 7 ? 'bg-destructive/20 text-destructive' :
                            daysLeft < 14 ? 'bg-warning/20 text-warning' :
                            'bg-success/20 text-success'
                          }`}>
                            {daysLeft} days
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(subject.examDate!).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Preparation</span>
                            <span className="font-medium">{subject.progress}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full gradient-primary"
                              style={{ width: `${subject.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming exams scheduled
                </p>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="mt-8"
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Weekly Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="font-medium mb-2">🎯 Key Achievements</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maintained {streak}-day study streak</li>
                  <li>• Completed {subjects.reduce((acc, s) => acc + s.completedTopics, 0)} topics across all subjects</li>
                  <li>• Studied for {totalWeeklyHours.toFixed(1)} hours this week</li>
                </ul>
              </div>

              <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
                <p className="font-medium mb-2">💡 Recommendations</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {weakSubjects.length > 0 && (
                    <li>• Focus more on {weakSubjects[0].name} - it needs extra attention</li>
                  )}
                  <li>• Study during your productive hours (6-9 AM, 4-8 PM) for better retention</li>
                  <li>• Take short breaks every 45 minutes to maintain focus</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Analytics;

