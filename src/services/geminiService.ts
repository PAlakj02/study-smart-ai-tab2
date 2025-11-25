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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Calculate weeks until exam
    const examDate = new Date(input.examDate);
    const today = new Date();
    const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weeksUntilExam = Math.max(1, Math.floor(daysUntilExam / 7));
    const totalWeeks = Math.min(weeksUntilExam, 12); // Cap at 12 weeks

    const prompt = `
You are an expert educational consultant. Create a DETAILED, SPECIFIC study roadmap.

**Student Details:**
- Subjects: ${input.subjects.join(', ')}
- Exam Date: ${input.examDate} (${totalWeeks} weeks from now)
- Current Level: ${input.currentLevel}
- Daily Study Hours: ${input.studyHoursPerDay} hours
- Weak Areas: ${input.weakAreas?.join(', ') || 'Not specified'}
- Goals: ${input.goals || 'Excel in exams'}

**CRITICAL INSTRUCTIONS - READ CAREFULLY:**

1. CREATE ${totalWeeks} CONSECUTIVE WEEKS (Week 1, Week 2, Week 3... Week ${totalWeeks})
2. EACH TOPIC MUST BE SPECIFIC AND ACTIONABLE - NOT GENERIC
3. FOCUS ON WEAK AREAS - ${input.weakAreas && input.weakAreas.length > 0 ? `Break down these areas: ${input.weakAreas.join(', ')}` : 'Cover all fundamentals'}

**FORBIDDEN WORDS (DO NOT USE):**
- "Mock test", "Practice questions", "Sample papers", "Revision", "Review", "Test preparation"

**REQUIRED TOPIC FORMAT:**
✓ GOOD: "Learn HTML semantic tags (header, nav, article, section)", "Master CSS Flexbox (justify-content, align-items)", "JavaScript ES6 Arrow Functions and this keyword"
✗ BAD: "Practice HTML", "Review CSS", "Mock test", "Sample questions"

**WEEK STRUCTURE:**
- Weeks 1-${Math.ceil(totalWeeks * 0.7)}: Learning new concepts (60-70% of time)
- Weeks ${Math.ceil(totalWeeks * 0.7) + 1}-${totalWeeks - 1}: Practice with specific exercises
- Week ${totalWeeks}: Final preparation with timed practice

**CRITICAL JSON FORMATTING RULES:**
- Return ONLY the JSON object
- NO comments, NO markdown, NO explanations
- Use sequential week numbers: 1, 2, 3, 4... ${totalWeeks}
- Each week needs 5-7 SPECIFIC topics

**JSON STRUCTURE:**
{
  "title": "Study Roadmap: ${input.subjects.join(' & ')}",
  "description": "${totalWeeks}-week plan from now until ${input.examDate}",
  "totalWeeks": ${totalWeeks},
  "weeklyPlans": [
    {
      "week": 1,
      "focus": "${input.subjects[0]} ${input.weakAreas && input.weakAreas[0] ? '- ' + input.weakAreas[0] + ' Basics' : 'Fundamentals'}",
      "topics": ["Learn [specific concept 1]", "Understand [specific concept 2]", "Master [specific skill 3]", "Practice [specific technique 4]", "Build [specific project 5]"],
      "goals": ["Complete all topics", "Solve 10 related problems"],
      "studyHours": ${input.studyHoursPerDay * 7}
    }
  ],
  "tips": ["Create flashcards for key concepts", "Practice daily for consistency", "Review mistakes immediately", "Take short breaks every hour", "Test yourself weekly"]
}

Return ONLY valid JSON. Make every topic CONCRETE and SPECIFIC to the subjects and weak areas.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    // Clean the JSON by removing comments and markdown code blocks
    let cleanedJson = jsonMatch[0];
    
    // Remove markdown code block markers first
    cleanedJson = cleanedJson.replace(/```json/gi, '');
    cleanedJson = cleanedJson.replace(/```/g, '');
    
    // Remove single-line comments (// ...) - more aggressive
    cleanedJson = cleanedJson.replace(/\/\/[^\n]*/g, '');
    
    // Remove multi-line comments (/* ... */)
    cleanedJson = cleanedJson.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Clean up any trailing commas before closing braces/brackets (invalid JSON)
    cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1');
    
    // Remove any extra whitespace
    cleanedJson = cleanedJson.trim();

    let roadmapData;
    try {
      roadmapData = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('JSON parse error, trying fallback:', parseError);
      console.error('Cleaned JSON:', cleanedJson);
      throw new Error('Failed to parse AI response as JSON');
    }

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
    const isEarlyStage = i <= totalWeeks * 0.6;
    const isMidStage = i > totalWeeks * 0.6 && i <= totalWeeks * 0.9;
    const subject = input.subjects[(i - 1) % input.subjects.length];
    const weakArea = input.weakAreas && input.weakAreas[(i - 1) % input.weakAreas.length];

    weeklyPlans.push({
      week: i,
      focus: isEarlyStage 
        ? `${subject} - ${weakArea || 'Fundamentals'}`
        : isMidStage
        ? `${subject} - Advanced ${weakArea || 'Concepts'}`
        : `${subject} - Final Preparation`,
      topics: isEarlyStage
        ? [
            `Understand ${weakArea || subject} basic concepts`,
            `Learn ${weakArea || subject} fundamental principles`,
            `Master ${weakArea || subject} core techniques`,
            `Practice ${weakArea || subject} basic exercises`,
            `Build simple ${subject} examples`
          ]
        : isMidStage
        ? [
            `Solve complex ${weakArea || subject} problems`,
            `Apply ${weakArea || subject} in real scenarios`,
            `Optimize ${weakArea || subject} solutions`,
            `Build advanced ${subject} projects`,
            `Debug ${weakArea || subject} issues`
          ]
        : [
            `Speed drills for ${weakArea || subject}`,
            `Timed problem solving - ${subject}`,
            `Create ${subject} reference notes`,
            `Fix ${weakArea || subject} weak points`,
            `Final ${subject} confidence building`
          ],
      goals: [
        `Complete all ${weakArea || subject} topics`,
        `Solve 15+ exercises`,
        `Build 1 project`
      ],
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

