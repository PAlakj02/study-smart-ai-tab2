import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStudyData } from '@/context/StudyDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Plus, BookOpen, Trash2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const SyllabusManager = () => {
  const navigate = useNavigate();
  const { subjects, addSubject, addSubjectTopic, updateTopicStatus, deleteSubject, loading } = useStudyData();
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [newSubjectDialog, setNewSubjectDialog] = useState(false);
  const [newTopicDialog, setNewTopicDialog] = useState<string | null>(null); // subjectId

  // Form states
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    color: 'bg-blue-500',
    examDate: '',
    priority: 3
  });

  const [topicForm, setTopicForm] = useState({
    name: '',
    timeAllocated: 60,
    description: ''
  });

  const toggleSubject = (id: string) => {
    const newSet = new Set(expandedSubjects);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedSubjects(newSet);
  };

  const handleAddSubject = () => {
    if (!subjectForm.name) {
      toast.error('Please enter a subject name');
      return;
    }

    addSubject({
      name: subjectForm.name,
      color: subjectForm.color,
      examDate: subjectForm.examDate || undefined,
      priority: subjectForm.priority,
      chapters: []
    });

    toast.success('Subject added successfully!');
    setNewSubjectDialog(false);
    setSubjectForm({ name: '', color: 'bg-blue-500', examDate: '', priority: 3 });
  };

  const handleAddTopic = () => {
    if (!newTopicDialog || !topicForm.name) {
      toast.error('Please enter a topic name');
      return;
    }

    addSubjectTopic(newTopicDialog, {
      name: topicForm.name,
      description: topicForm.description || undefined,
      timeAllocated: topicForm.timeAllocated,
    });

    toast.success('Topic added successfully!');
    setNewTopicDialog(null);
    setTopicForm({ name: '', timeAllocated: 60, description: '' });
  };

  const colors = [
    { value: 'bg-blue-500', label: 'Blue' },
    { value: 'bg-purple-500', label: 'Purple' },
    { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-pink-500', label: 'Pink' },
    { value: 'bg-yellow-500', label: 'Yellow' },
    { value: 'bg-teal-500', label: 'Teal' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in-progress': return 'bg-primary';
      case 'revising': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '✓ Completed';
      case 'in-progress': return '⟳ In Progress';
      case 'revising': return '↻ Revising';
      default: return '○ Pending';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success border-success/20';
      case 'in-progress': return 'bg-primary/10 text-primary border-primary/20';
      case 'revising': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

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
                <h1 className="text-xl sm:text-2xl font-bold">My Subjects</h1>
                <p className="text-sm text-muted-foreground">Add subjects and topics — your syllabus, in your own words</p>
              </div>
            </div>
            <Dialog open={newSubjectDialog} onOpenChange={setNewSubjectDialog}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Subject</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subject Name</Label>
                    <Input
                      placeholder="e.g., Mathematics"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setSubjectForm({ ...subjectForm, color: color.value })}
                          className={`h-10 rounded-lg ${color.value} ${
                            subjectForm.color === color.value ? 'ring-2 ring-foreground ring-offset-2' : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Exam Date (Optional)</Label>
                    <Input
                      type="date"
                      value={subjectForm.examDate}
                      onChange={(e) => setSubjectForm({ ...subjectForm, examDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Priority (1-5)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      value={subjectForm.priority}
                      onChange={(e) => setSubjectForm({ ...subjectForm, priority: parseInt(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleAddSubject} className="w-full gradient-primary text-white">
                    Add Subject
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <Card className="p-12 text-center">
            <div className="h-16 w-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-semibold mb-2">Loading your subjects...</h3>
          </Card>
        ) : subjects.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No Subjects Yet</h3>
            <p className="text-muted-foreground mb-6">Start by adding your first subject</p>
            <Button onClick={() => setNewSubjectDialog(true)} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Subject
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {subjects.map((subject, subjectIndex) => {
              // Topics live inside chapters purely for Firestore backward-compat —
              // the UI here presents them as a single flat list per subject.
              const topics = subject.chapters.flatMap(c =>
                c.topics.map(t => ({ ...t, chapterId: c.id })),
              );

              return (
                <motion.div
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: subjectIndex * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    {/* Subject Header */}
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleSubject(subject.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          {expandedSubjects.has(subject.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className={`h-10 w-10 rounded-lg ${subject.color} flex items-center justify-center`}>
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{subject.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{topics.length} topics</span>
                              {subject.examDate && (
                                <>
                                  <span>•</span>
                                  <span>Exam: {new Date(subject.examDate).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right mr-4">
                            <p className="text-2xl font-bold text-gradient">{subject.progress}%</p>
                            <p className="text-xs text-muted-foreground">Complete</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this subject?')) {
                                deleteSubject(subject.id);
                                toast.success('Subject deleted');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <Progress value={subject.progress} className="mt-3" />
                    </div>

                    {/* Expanded Content — flat Topics list */}
                    {expandedSubjects.has(subject.id) && (
                      <div className="border-t border-border p-4 bg-muted/20">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold">Topics</h4>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/roadmap?subjectId=${subject.id}`)}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              Generate Roadmap
                            </Button>
                            <Dialog open={newTopicDialog === subject.id} onOpenChange={(open) => setNewTopicDialog(open ? subject.id : null)}>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Topic
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Add Topic to {subject.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Topic Name</Label>
                                    <Input
                                      placeholder="e.g., Derivatives"
                                      value={topicForm.name}
                                      onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Description</Label>
                                    <Textarea
                                      placeholder="What does this topic cover? This is used to generate your AI roadmap."
                                      value={topicForm.description}
                                      onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <Label>Time Allocated (minutes)</Label>
                                    <Input
                                      type="number"
                                      value={topicForm.timeAllocated}
                                      onChange={(e) => setTopicForm({ ...topicForm, timeAllocated: parseInt(e.target.value) })}
                                    />
                                  </div>
                                  <Button onClick={handleAddTopic} className="w-full gradient-primary text-white">
                                    Add Topic
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>

                        {topics.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">
                            No topics added yet — add your syllabus topics here before generating an AI roadmap
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {topics.map((topic) => (
                              <div
                                key={topic.id}
                                className={`flex items-center justify-between p-3 bg-card rounded border transition-all ${
                                  topic.status === 'completed'
                                    ? 'border-success/30 bg-success/5'
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <div className={`h-3 w-3 rounded-full ${getStatusColor(topic.status)} flex-shrink-0`} />
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${topic.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                      {topic.name}
                                    </p>
                                    {topic.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{topic.notes}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1">
                                      <p className="text-xs font-medium text-primary">
                                        ⏱ {topic.timeAllocated} min
                                      </p>
                                      {topic.status === 'completed' && (
                                        <span className="text-xs text-success font-medium">
                                          ✓ Added to study hours
                                        </span>
                                      )}
                                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadgeClass(topic.status)}`}>
                                        {getStatusLabel(topic.status)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={topic.status}
                                    onChange={(e) => {
                                      updateTopicStatus(subject.id, topic.chapterId, topic.id, e.target.value as any);
                                      if (e.target.value === 'completed') {
                                        toast.success(`${topic.name} completed! 🎉`);
                                      }
                                    }}
                                    className={`text-xs px-3 py-1.5 bg-background border border-input rounded-md font-medium hover:border-primary cursor-pointer ${
                                      topic.status === 'completed' ? 'text-success' : ''
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="pending">○ Pending</option>
                                    <option value="in-progress">⟳ In Progress</option>
                                    <option value="completed">✓ Completed</option>
                                    <option value="revising">↻ Revising</option>
                                  </select>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SyllabusManager;
