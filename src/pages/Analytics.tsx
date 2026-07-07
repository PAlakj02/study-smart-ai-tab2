import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Clock, Target, BookOpen, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

/** Local calendar date string — NOT toISOString(), which converts to UTC
 *  first and can land on the wrong day depending on timezone. Same safe
 *  pattern already used in StudyCalendar.tsx / Dashboard.tsx. */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { subjects, totalStudyHours, sessions } = useStudyData();

  // Calculate total topics (pooled across every subject)
  const totalTopics = subjects.reduce((acc, s) => acc + s.totalTopics, 0);
  const completedTopics = subjects.reduce((acc, s) => acc + s.completedTopics, 0);

  // Overall progress = completed topics / total topics across the whole
  // planner — not an average of each subject's own percentage, which would
  // weight a 2-topic subject the same as a 50-topic one.
  const overallProgress = totalTopics > 0
    ? Math.round((completedTopics / totalTopics) * 100)
    : 0;

  // Weekly Study Hours — real completed session durations for the current
  // Mon-Sun week, grouped by day. No random/estimated values.
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const monday = (() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun..6=Sat
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return d;
  })();
  const weeklyStudyData = DAY_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = toLocalDateStr(d);
    const minutes = sessions
      .filter(s => s.completed && s.date.substring(0, 10) === ds)
      .reduce((sum, s) => sum + s.duration, 0);
    return { day: label, hours: Number((minutes / 60).toFixed(1)) };
  });
  const hasAnySessionHistory = sessions.length > 0;

  // Calculate status breakdown across all topics (real Topic.status values)
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

  // Upcoming Exams — same real computation Dashboard.tsx already uses,
  // sourced from each subject's actual exam date.
  const upcomingExams = subjects
    .filter(s => s.examDate)
    .map(s => ({
      subject: s.name,
      color: s.color,
      date: new Date(s.examDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      daysLeft: Math.ceil((new Date(s.examDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      status: s.progress >= 60 ? 'on-track' : 'needs-attention',
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const totalWeeklyHours = weeklyStudyData.reduce((acc, day) => acc + day.hours, 0);
  const avgDailyHours = (totalWeeklyHours / 7).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Analytics & Insights</h1>
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
              {!hasAnySessionHistory ? (
                <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                  <div className="text-center">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No study sessions logged yet</p>
                    <p className="text-xs mt-1">Complete a session to see your weekly hours here</p>
                  </div>
                </div>
              ) : (
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
              )}
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
              {/* No timestamped completion history exists yet (Topic.status has
                  no "completed at" field), so there's no real week-by-week trend
                  to plot — showing an honest empty state instead of inventing one. */}
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Not enough history yet</p>
                  <p className="text-xs mt-1 max-w-[220px] mx-auto">
                    Progress trends will appear here once completion history builds up over time
                  </p>
                </div>
              </div>
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

        {/* Upcoming Exams — computed from each subject's real exam date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Upcoming Exams</h3>
            </div>
            {upcomingExams.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No exams scheduled</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingExams.map(exam => (
                  <div key={exam.subject} className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${exam.color}`} />
                        <h4 className="font-semibold">{exam.subject}</h4>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        exam.status === 'on-track' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                      }`}>
                        {exam.status === 'on-track' ? 'On Track' : 'Needs Attention'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{exam.date}</p>
                    <p className={`text-sm font-medium ${
                      exam.daysLeft < 7 ? 'text-destructive' :
                      exam.daysLeft < 14 ? 'text-warning' : 'text-primary'
                    }`}>
                      {exam.daysLeft >= 0 ? `${exam.daysLeft} days left` : 'Date passed'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

      </main>
    </div>
  );
};

export default Analytics;

