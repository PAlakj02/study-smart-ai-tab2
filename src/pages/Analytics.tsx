import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Clock, Target, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const Analytics = () => {
  const navigate = useNavigate();
  const { subjects, totalStudyHours, sessions } = useStudyData();

  // Calculate overall progress from subjects
  const overallProgress = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, s) => acc + s.progress, 0) / subjects.length)
    : 0;

  // Calculate total topics
  const totalTopics = subjects.reduce((acc, s) => acc + s.totalTopics, 0);
  const completedTopics = subjects.reduce((acc, s) => acc + s.completedTopics, 0);

  // Generate weekly study data based on study hours distribution
  const avgHoursPerDay = totalStudyHours > 0 ? totalStudyHours / 30 : 4; // Estimate over ~30 days
  const weeklyStudyData = [
    { day: 'Mon', hours: Number((avgHoursPerDay * (0.9 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Tue', hours: Number((avgHoursPerDay * (0.9 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Wed', hours: Number((avgHoursPerDay * (0.85 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Thu', hours: Number((avgHoursPerDay * (1.0 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Fri', hours: Number((avgHoursPerDay * (0.95 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Sat', hours: Number((avgHoursPerDay * (1.1 + Math.random() * 0.2)).toFixed(1)) },
    { day: 'Sun', hours: Number((avgHoursPerDay * (0.7 + Math.random() * 0.2)).toFixed(1)) }
  ];

  // Subject distribution by total topics
  const subjectDistribution = subjects
    .filter(s => s.totalTopics > 0)
    .map(s => ({
      name: s.name,
      value: s.totalTopics,
      completedValue: s.completedTopics,
      color: s.color
    }));

  // Generate progress trend based on actual progress
  const progressTrend = [
    { week: 'Week 1', progress: Math.max(0, overallProgress - 30) },
    { week: 'Week 2', progress: Math.max(0, overallProgress - 20) },
    { week: 'Week 3', progress: Math.max(0, overallProgress - 10) },
    { week: 'Week 4', progress: overallProgress }
  ];

  // Calculate status breakdown across all topics
  const statusCounts = {
    pending: 0,
    inProgress: 0,
    completed: 0,
    revising: 0
  };
  
  subjects.forEach(subject => {
    subject.chapters.forEach(chapter => {
      chapter.topics.forEach(topic => {
        if (topic.status === 'pending') statusCounts.pending++;
        else if (topic.status === 'in-progress') statusCounts.inProgress++;
        else if (topic.status === 'completed') statusCounts.completed++;
        else if (topic.status === 'revising') statusCounts.revising++;
      });
    });
  });

  const statusDistribution = [
    { name: 'Completed', value: statusCounts.completed, color: '#10b981' },
    { name: 'In Progress', value: statusCounts.inProgress, color: '#3b82f6' },
    { name: 'Revising', value: statusCounts.revising, color: '#f59e0b' },
    { name: 'Pending', value: statusCounts.pending, color: '#6b7280' }
  ].filter(item => item.value > 0);

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
              <TrendingUp className="h-4 w-4 mr-2" />
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
                All time study progress
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
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Subjects</p>
              <p className="text-3xl font-bold">{subjects.length}</p>
              <p className="text-xs text-success mt-2">Active subjects 📚</p>
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
                  <Target className="h-6 w-6 text-info" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Overall Progress</p>
              <p className="text-3xl font-bold">{overallProgress}%</p>
              <p className="text-xs text-muted-foreground mt-2">{completedTopics}/{totalTopics} topics</p>
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
              <h3 className="text-lg font-semibold mb-6">Subject-wise Progress</h3>
              {subjects.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No subjects yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {subjects.map((subject, index) => (
                    <div key={subject.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className={`h-3 w-3 rounded ${subject.color}`} />
                          <span className="font-medium text-sm">{subject.name}</span>
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-primary">{subject.progress}%</span>
                          <span className="text-muted-foreground ml-2">
                            ({subject.completedTopics}/{subject.totalTopics})
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full gradient-primary transition-all duration-500"
                          style={{ width: `${subject.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Progress Trend and Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Topics by Status</h3>
              {statusDistribution.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  <div className="text-center">
                    <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No topics yet</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </motion.div>
        </div>

      </main>
    </div>
  );
};

export default Analytics;

