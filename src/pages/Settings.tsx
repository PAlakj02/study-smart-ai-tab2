import { useState } from 'react';
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/context/AuthContext';
import { useStudyData } from '@/context/StudyDataContext';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Clock } from "lucide-react";
import { toast } from 'sonner';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, updatePreferences } = useStudyData();
  
  const [sessionDuration, setSessionDuration] = useState(preferences.studyStyle === 'long' ? 45 : 30);
  const [breakDuration, setBreakDuration] = useState(preferences.breakPreference === 'long' ? 15 : 10);
  const [autoAdjust, setAutoAdjust] = useState(true);

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
                <div>
                  <Label>Grade</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={user?.grade || '12'}
                    disabled
                  >
                    <option value="12">Grade 12</option>
                    <option value="11">Grade 11</option>
                    <option value="10">Grade 10</option>
                  </select>
                </div>
                <div>
                  <Label>Board</Label>
                  <input
                    type="text"
                    value={user?.board || ''}
                    readOnly
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Study Preferences */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Study Preferences</h2>
                  <p className="text-sm text-muted-foreground">Customize your study sessions</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Default Session Duration</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(parseInt(e.target.value))}
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div>
                  <Label>Break Duration</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                  >
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="20">20 minutes</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-adjust on missed sessions</Label>
                    <p className="text-sm text-muted-foreground">Automatically reschedule</p>
                  </div>
                  <Switch checked={autoAdjust} onCheckedChange={setAutoAdjust} />
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Save Button */}
          <div className="flex gap-4">
            <Button 
              className="flex-1 gradient-primary text-white"
              onClick={() => {
                updatePreferences({
                  studyStyle: sessionDuration >= 45 ? 'long' : 'short',
                  breakPreference: breakDuration >= 15 ? 'long' : 'short'
                });
                toast.success('Settings saved successfully!');
              }}
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
