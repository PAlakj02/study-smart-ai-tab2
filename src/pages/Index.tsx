import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Brain, 
  Calendar, 
  Target, 
  TrendingUp, 
  Zap, 
  Heart,
  ArrowRight,
  CheckCircle,
  Clock,
  BookOpen,
  Sparkles,
  Stars,
  Award
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Scheduling",
      description: "Smart algorithms adapt your schedule based on your learning style and progress."
    },
    {
      icon: Calendar,
      title: "Adaptive Planning",
      description: "Automatically adjusts when you miss sessions or need more time on difficult topics."
    },
    {
      icon: Target,
      title: "Smart Prioritization",
      description: "Focus on what matters most with intelligent priority ranking for your subjects."
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Visualize your study journey with detailed analytics and insights."
    },
    {
      icon: Zap,
      title: "Focus Mode",
      description: "Distraction-free study sessions with built-in timers and break reminders."
    },
    {
      icon: Heart,
      title: "Motivation System",
      description: "Stay motivated with streaks, achievements, and gamified progress."
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Share Your Details",
      description: "Tell us about your subjects, exams, and study preferences."
    },
    {
      number: "02",
      title: "AI Generates Plan",
      description: "Our smart algorithm creates a personalized study schedule."
    },
    {
      number: "03",
      title: "Study & Track",
      description: "Follow your schedule and watch your progress grow."
    },
    {
      number: "04",
      title: "Achieve Goals",
      description: "Ace your exams with consistent, organized preparation."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -top-24 -right-24 w-96 h-96 gradient-primary rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute -bottom-24 -left-24 w-96 h-96 bg-secondary/40 rounded-full blur-3xl"
          />
          
          {/* Floating Icons */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -30, 0],
                x: [0, Math.random() * 20 - 10, 0],
                rotate: [0, 360],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 5 + Math.random() * 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2
              }}
              className="absolute"
              style={{
                top: `${Math.random() * 80 + 10}%`,
                left: `${Math.random() * 90 + 5}%`,
              }}
            >
              {i % 6 === 0 && <Brain className="h-8 w-8 text-primary/20" />}
              {i % 6 === 1 && <Calendar className="h-8 w-8 text-secondary/20" />}
              {i % 6 === 2 && <Target className="h-8 w-8 text-success/20" />}
              {i % 6 === 3 && <TrendingUp className="h-8 w-8 text-primary/20" />}
              {i % 6 === 4 && <Zap className="h-8 w-8 text-warning/20" />}
              {i % 6 === 5 && <Award className="h-8 w-8 text-info/20" />}
            </motion.div>
          ))}
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Content */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center lg:text-left"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">AI-Powered Study Planning</span>
                </motion.div>
                
                <motion.h1 
                  className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Master Your Studies with
                  <span className="text-gradient block mt-2">Smart Planning</span>
                </motion.h1>
                
                <motion.p 
                  className="text-xl text-muted-foreground mb-8 max-w-xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Transform your exam preparation with intelligent scheduling, adaptive planning, 
                  and personalized study tracking designed to help you excel.
                </motion.p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button 
                    size="lg" 
                    className="gradient-primary text-white text-lg px-8 py-6 h-auto hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                    onClick={() => navigate('/login')}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    className="text-lg px-8 py-6 h-auto hover:bg-primary/5 border-2"
                    onClick={() => navigate('/login')}
                  >
                    Sign In
                  </Button>
                </motion.div>

                {/* Stats */}
                <motion.div 
                  className="grid grid-cols-3 gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {[
                    { icon: BookOpen, value: "10K+", label: "Students" },
                    { icon: CheckCircle, value: "95%", label: "Success" },
                    { icon: Clock, value: "50K+", label: "Hours" }
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      className="text-center"
                    >
                      <stat.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right Visual */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                {/* Main Dashboard Card */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10"
                >
                  <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-2xl border-2">
                    <div className="space-y-6">
                      {/* Progress Circle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Overall Progress</div>
                          <div className="text-4xl font-bold text-gradient">75%</div>
                        </div>
                        <div className="relative w-24 h-24">
                          <svg className="transform -rotate-90 w-24 h-24">
                            <circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="currentColor"
                              strokeWidth="6"
                              fill="none"
                              className="text-muted"
                            />
                            <motion.circle
                              cx="48"
                              cy="48"
                              r="40"
                              stroke="url(#hero-gradient)"
                              strokeWidth="6"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 40}`}
                              initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                              animate={{ strokeDashoffset: 2 * Math.PI * 40 * 0.25 }}
                              transition={{ duration: 2, delay: 1 }}
                              strokeLinecap="round"
                            />
                            <defs>
                              <linearGradient id="hero-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="hsl(217, 91%, 60%)" />
                                <stop offset="100%" stopColor="hsl(262, 83%, 58%)" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      </div>

                      {/* Subject List */}
                      <div className="space-y-3">
                        {[
                          { name: "Mathematics", progress: 85, color: "bg-blue-500" },
                          { name: "Physics", progress: 70, color: "bg-purple-500" },
                          { name: "Chemistry", progress: 65, color: "bg-green-500" }
                        ].map((subject, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.2 }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded ${subject.color}`} />
                                <span className="text-sm font-medium">{subject.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground">{subject.progress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full ${subject.color}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${subject.progress}%` }}
                                transition={{ duration: 1, delay: 1.2 + i * 0.2 }}
                              />
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Streak Badge */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2 }}
                        className="flex items-center justify-center gap-2 py-3 bg-warning/10 border border-warning/20 rounded-lg"
                      >
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Zap className="h-5 w-5 text-warning" />
                        </motion.div>
                        <span className="font-semibold text-warning">7 Day Streak! 🔥</span>
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>

                {/* Floating Mini Cards */}
                <motion.div
                  animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -right-6 top-12 z-20"
                >
                  <Card className="p-4 bg-success/10 border-success/30 shadow-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                        <div className="text-lg font-bold">24 Topics</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute -left-6 bottom-12 z-20"
                >
                  <Card className="p-4 bg-primary/10 border-primary/30 shadow-xl">
                    <div className="flex items-center gap-2">
                      <Stars className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Study Time</div>
                        <div className="text-lg font-bold">142 Hours</div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to <span className="text-gradient">Excel</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you study smarter, not harder
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-border/50">
                  <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple 4-step process
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-6 mb-12 last:mb-0"
              >
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-24 w-0.5 bg-gradient-to-b from-primary to-secondary mx-auto mt-4" />
                  )}
                </div>
                <div className="flex-1 pt-3">
                  <h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-lg">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-surface/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { icon: BookOpen, value: "10K+", label: "Students" },
              { icon: CheckCircle, value: "95%", label: "Success Rate" },
              { icon: Clock, value: "50K+", label: "Study Hours" },
              { icon: Target, value: "1M+", label: "Goals Achieved" }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold mb-1 text-gradient">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Transform Your <span className="text-gradient">Study Routine?</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of students who are already studying smarter and achieving their goals.
            </p>
            <Button 
              size="lg" 
              className="gradient-primary text-white text-lg px-12 py-7 h-auto hover:scale-105 transition-transform shadow-xl animate-glow"
              onClick={() => navigate('/login')}
            >
              Get Started Now - It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 StudySync. Built for students, by students. 💜</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
