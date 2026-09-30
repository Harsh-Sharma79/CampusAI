export type ThemeChoice = 'light' | 'dark' | 'system';
export type MaterialKind = 'PDF' | 'Notes' | 'Syllabus' | 'PYQ';
export type MasteryBand = 'strong' | 'review' | 'weak';

export interface Student {
  id: string;
  name: string;
  email: string;
  university: string;
  course: string;
  semester: number;
  dailyGoalMinutes: number;
}

export interface Subject {
  id: string;
  name: string;
  mastery: number;
  accent: string;
  icon: string;
}

export interface Topic {
  id: string;
  name: string;
  subjectId: string;
  mastery: number;
  recentScore: number;
  lastStudied: string;
  recommendation: string;
  band: MasteryBand;
}

export interface Material {
  id: string;
  name: string;
  subject: string;
  kind: MaterialKind;
  pages: number;
  uploadedAt: string;
  status: 'Analyzed' | 'Processing' | 'Needs attention';
  topics: string[];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
}

export interface Quiz {
  id: string;
  subject: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: QuizQuestion[];
  createdAt: string;
}

export interface QuizResult {
  quizId: string;
  score: number;
  correct: number;
  total: number;
  masteryGain: number;
  answers: number[];
  strongTopics: string[];
  reviewTopics: string[];
}

export interface FlashcardData {
  id: string;
  subject: string;
  front: string;
  back: string;
  topic: string;
}

export interface StudyTask {
  id: string;
  title: string;
  subject: string;
  time: string;
  date?: string;
  duration: number;
  completed: boolean;
  type: 'revision' | 'quiz' | 'flashcards' | 'study';
}

export interface StudyDay {
  day: string;
  hours: number;
  quiz: number;
  mastery: number;
}

export interface AIResponse {
  text: string;
  sources: string[];
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'success' | 'info' | 'error';
}
