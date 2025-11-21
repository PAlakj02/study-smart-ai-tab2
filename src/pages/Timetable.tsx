import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";

const Timetable = () => {
  const navigate = useNavigate();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const sessions = [
    { day: 0, startHour: 9, duration: 1, subject: 'Mathematics', topic: 'Calculus', color: 'bg-blue-500' },
    { day: 0, startHour: 11, duration: 1, subject: 'Physics', topic: 'Mechanics', color: 'bg-purple-500' },
    { day: 0, startHour: 14, duration: 1.5, subject: 'Chemistry', topic: 'Organic', color: 'bg-green-500' },
    { day: 1, startHour: 9, duration: 1, subject: 'English', topic: 'Literature', color: 'bg-orange-500' },
    { day: 1, startHour: 15, duration: 1, subject: 'Mathematics', topic: 'Algebra', color: 'bg-blue-500' },
    { day: 2, startHour: 10, duration: 1, subject: 'Physics', topic: 'Electricity', color: 'bg-purple-500' },
    { day: 2, startHour: 14, duration: 1, subject: 'Chemistry', topic: 'Inorganic', color: 'bg-green-500' },
    { day: 3, startHour: 9, duration: 1.5, subject: 'Mathematics', topic: 'Geometry', color: 'bg-blue-500' },
    { day: 3, startHour: 15, duration: 1, subject: 'English', topic: 'Grammar', color: 'bg-orange-500' },
    { day: 4, startHour: 10, duration: 1, subject: 'Physics', topic: 'Optics', color: 'bg-purple-500' },
    { day: 4, startHour: 14, duration: 1, subject: 'Chemistry', topic: 'Physical', color: 'bg-green-500' },
  ];

  const currentDay = 1; // Tuesday (0-indexed)
  const currentHour = 11;

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
                <h1 className="text-2xl font-bold">Weekly Timetable</h1>
                <p className="text-sm text-muted-foreground">Dec 4 - Dec 10, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">Today</Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-blue-500" />
            <span className="text-sm">Mathematics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-purple-500" />
            <span className="text-sm">Physics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-green-500" />
            <span className="text-sm">Chemistry</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-orange-500" />
            <span className="text-sm">English</span>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="container mx-auto px-4 pb-8">
        <Card className="p-6 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-sm font-medium text-muted-foreground"></div>
              {days.map((day, index) => (
                <div 
                  key={day} 
                  className={`text-center p-2 rounded-lg font-medium ${
                    index === currentDay ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  <div className="text-sm">{day.substring(0, 3)}</div>
                  <div className="text-xs text-muted-foreground">Dec {4 + index}</div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="relative">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 gap-2 mb-2">
                  {/* Time Label */}
                  <div className="text-sm text-muted-foreground py-2">
                    {hour}:00
                  </div>
                  
                  {/* Day Cells */}
                  {days.map((_, dayIndex) => {
                    const daySessions = sessions.filter(
                      s => s.day === dayIndex && s.startHour <= hour && s.startHour + s.duration > hour
                    );
                    
                    const isCurrentTime = dayIndex === currentDay && hour === currentHour;
                    
                    return (
                      <motion.div
                        key={`${dayIndex}-${hour}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: (dayIndex * 0.05) + (hour * 0.02) }}
                        className={`relative min-h-[60px] rounded border ${
                          isCurrentTime 
                            ? 'border-primary border-2 bg-primary/5' 
                            : 'border-border bg-surface/50'
                        }`}
                      >
                        {daySessions.map((session) => {
                          // Only render on the starting hour
                          if (session.startHour === hour) {
                            const heightMultiplier = session.duration;
                            return (
                              <motion.div
                                key={`${session.subject}-${session.topic}`}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                whileHover={{ scale: 1.02 }}
                                className={`absolute inset-0 ${session.color} text-white p-2 rounded cursor-pointer shadow-md`}
                                style={{ 
                                  height: `${heightMultiplier * 60 + (heightMultiplier - 1) * 8}px`,
                                  zIndex: 10 
                                }}
                                onClick={() => navigate('/study-session')}
                              >
                                <p className="font-semibold text-sm truncate">{session.subject}</p>
                                <p className="text-xs opacity-90 truncate">{session.topic}</p>
                                <p className="text-xs opacity-75 mt-1">{session.duration}h</p>
                              </motion.div>
                            );
                          }
                          return null;
                        })}
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {/* Current Time Indicator */}
              {currentDay >= 0 && currentHour >= 8 && currentHour < 20 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  className="absolute left-20 right-0 h-0.5 bg-primary z-20"
                  style={{ 
                    top: `${(currentHour - 8) * 68 + 34}px` 
                  }}
                >
                  <div className="absolute -left-2 -top-1.5 h-3 w-3 rounded-full bg-primary animate-pulse" />
                </motion.div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Timetable;
