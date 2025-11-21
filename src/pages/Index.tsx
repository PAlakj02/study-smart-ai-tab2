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
  BookOpen
} from "lucide-react";
import heroImage from "@/assets/hero-study-planner.jpg";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Scheduling",
      description: "Smart algorithms adapt your timetable based on your learning style and progress."
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
      description: "Our smart algorithm creates a personalized study timetable."
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-block mb-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            >
              <span className="text-sm font-medium text-primary">✨ AI-Powered Study Planning</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Your Personal
              <span className="text-gradient block mt-2">AI Study Planner</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your exam preparation with intelligent scheduling, adaptive planning, 
              and motivational tracking designed for students like you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="gradient-primary text-white text-lg px-8 py-6 h-auto hover:scale-105 transition-transform shadow-lg hover:shadow-xl animate-glow"
                onClick={() => navigate('/onboarding')}
              >
                Start Planning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6 h-auto hover:bg-muted/50"
              >
                See How It Works
              </Button>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="rounded-2xl overflow-hidden shadow-2xl border border-border animate-float"
            >
              <img 
                src={heroImage} 
                alt="StudySync Dashboard" 
                className="w-full h-auto"
              />
            </motion.div>
          </motion.div>
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
              onClick={() => navigate('/onboarding')}
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
