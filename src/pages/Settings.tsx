import { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Timer } from "lucide-react";
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get Pomodoro settings from localStorage
  const savedPomodoroSettings = JSON.parse(localStorage.getItem('pomodoroSettings') || '{"sessionDuration": 45, "shortBreak": 5, "longBreak": 15}');
  const [sessionDuration, setSessionDuration] = useState(savedPomodoroSettings.sessionDuration);
  const [shortBreak, setShortBreak] = useState(savedPomodoroSettings.shortBreak);
  const [longBreak, setLongBreak] = useState(savedPomodoroSettings.longBreak);

  const handleSaveSettings = () => {
    const pomodoroSettings = {
      sessionDuration,
      shortBreak,
      longBreak
    };
    localStorage.setItem('pomodoroSettings', JSON.stringify(pomodoroSettings));
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Profile</h2>
                  <p className="text-sm text-muted-foreground">Update your personal information</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Display Name</Label>
                  <input
                    type="text"
                    value={user?.name || ''}
                    readOnly
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Pomodoro Timer Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                  <Timer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Pomodoro Timer</h2>
                  <p className="text-sm text-muted-foreground">Customize your study session timers</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Session Duration (minutes)</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  >
                    <option value="25">25 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Focus time before break</p>
                </div>
                
                <div>
                  <Label>Short Break (minutes)</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={shortBreak}
                    onChange={(e) => setShortBreak(parseInt(e.target.value))}
                  >
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Quick refresh break</p>
                </div>
                
                <div>
                  <Label>Long Break (minutes)</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={longBreak}
                    onChange={(e) => setLongBreak(parseInt(e.target.value))}
                  >
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                    <option value="30">30 minutes</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Extended break after multiple sessions</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button 
              className="flex-1 gradient-primary text-white"
              onClick={handleSaveSettings}
            >
              Save Changes
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
