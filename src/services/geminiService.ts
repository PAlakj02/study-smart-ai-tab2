import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('Gemini API key is not set. AI features will be limited.');
}

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface RoadmapInput {
  subjects: string[];
  examDate: string;
  currentLevel: string;
  studyHoursPerDay: number;
  weakAreas?: string[];
  goals?: string;
  preferredStudyStyle?: string;
}

export interface WeekPlan {
  week: number;
  focus: string;
  topics: string[];
  goals: string[];
  studyHours: number;
}

export interface StudyRoadmap {
  id: string;
  title: string;
  description: string;
  totalWeeks: number;
  weeklyPlans: WeekPlan[];
  tips: string[];
  createdAt: string;
}

export const generateStudyRoadmap = async (input: RoadmapInput): Promise<StudyRoadmap> => {
  if (!genAI) {
    // Return demo roadmap if API key is not set
    return generateDemoRoadmap(input);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are an expert educational consultant. Create a detailed, personalized study roadmap for a student with the following details:

**Student Information:**
- Subjects: ${input.subjects.join(', ')}
- Exam Date: ${input.examDate}
- Current Level: ${input.currentLevel}
- Daily Study Hours: ${input.studyHoursPerDay} hours
- Weak Areas: ${input.weakAreas?.join(', ') || 'None specified'}
- Goals: ${input.goals || 'Excel in exams'}
- Preferred Study Style: ${input.preferredStudyStyle || 'Mixed'}

**Task:**
Create a week-by-week study roadmap from now until the exam date. For each week, provide:
1. Main focus area
2. Specific topics to cover
3. Achievable goals
4. Recommended study hours

Also include:
- Overall study tips
- Time management strategies
- Revision strategies

**Format your response as a JSON object with this structure:**
{
  "title": "Personalized Study Roadmap",
  "description": "A brief overview of the plan",
  "totalWeeks": number,
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "Foundation building",
      "topics": ["Topic 1", "Topic 2"],
      "goals": ["Goal 1", "Goal 2"],
      "studyHours": 35
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}

Make it realistic, achievable, and motivating. Consider the student's weak areas and daily availability.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const roadmapData = JSON.parse(jsonMatch[0]);

    return {
      id: `roadmap-${Date.now()}`,
      ...roadmapData,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating roadmap with Gemini:', error);
    // Fallback to demo roadmap
    return generateDemoRoadmap(input);
  }
};

// Demo roadmap generator for when API is not available
const generateDemoRoadmap = (input: RoadmapInput): StudyRoadmap => {
  const today = new Date();
  const examDate = new Date(input.examDate);
  const weeksUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalWeeks = Math.min(weeksUntilExam, 12); // Cap at 12 weeks

  const weeklyPlans: WeekPlan[] = [];
  
  for (let i = 1; i <= totalWeeks; i++) {
    const isEarlyStage = i <= totalWeeks / 3;
    const isMidStage = i > totalWeeks / 3 && i <= (2 * totalWeeks) / 3;
    const isRevisionStage = i > (2 * totalWeeks) / 3;

    weeklyPlans.push({
      week: i,
      focus: isEarlyStage 
        ? `Foundation & Concept Building - ${input.subjects[i % input.subjects.length]}`
        : isMidStage
        ? `Practice & Application - ${input.subjects[i % input.subjects.length]}`
        : `Revision & Mock Tests - ${input.subjects[i % input.subjects.length]}`,
      topics: isEarlyStage
        ? ['Core Concepts', 'Fundamental Theories', 'Basic Problem Solving']
        : isMidStage
        ? ['Advanced Problems', 'Previous Year Questions', 'Chapter-wise Tests']
        : ['Complete Revision', 'Mock Tests', 'Weak Area Focus'],
      goals: isEarlyStage
        ? ['Complete chapter readings', 'Make detailed notes', 'Solve 20+ practice problems']
        : isMidStage
        ? ['Solve 50+ problems', 'Complete 2 chapter tests', 'Improve speed']
        : ['Complete 2 full-length tests', 'Revise all formulas', 'Score 80%+ in mocks'],
      studyHours: input.studyHoursPerDay * 7
    });
  }

  return {
    id: `roadmap-${Date.now()}`,
    title: `${totalWeeks}-Week Study Roadmap`,
    description: `A personalized ${totalWeeks}-week study plan covering ${input.subjects.join(', ')} with ${input.studyHoursPerDay} hours of daily study.`,
    totalWeeks,
    weeklyPlans,
    tips: [
      '🎯 Follow the Pomodoro Technique: 25 minutes study, 5 minutes break',
      '📚 Start with difficult subjects when your mind is fresh',
      '✍️ Make concise notes and mind maps for quick revision',
      '🔄 Review previous topics regularly to maintain retention',
      '💪 Take care of your health - sleep 7-8 hours, exercise regularly',
      '📱 Minimize distractions - keep phone away during study sessions',
      '🤝 Study in groups occasionally for better understanding',
      '⏰ Stick to your schedule but be flexible when needed'
    ],
    createdAt: new Date().toISOString()
  };
};

export default genAI;

