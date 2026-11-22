export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  quizScore?: number;
  quizTotal?: number;
  lastStudiedAt: number;
}

export interface StreakRecord {
  id: string; // single key 'main'
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // 'YYYY-MM-DD'
  freezeCount: number;
  activeDates: string[]; // ['YYYY-MM-DD', ...]
}

export interface SrsCardRecord {
  cardId: string;
  deckId: string;
  repetitions: number;
  interval: number; // days
  easeFactor: number; // starts at 2.5
  dueDate: number; // timestamp ms
  lastReviewedAt: number;
}

export interface CaseStudyProgress {
  caseId: string;
  studied: boolean;
  bookmarked: boolean;
  notes?: string;
  updatedAt: number;
}

export interface InterviewProgress {
  promptId: string;
  practiced: boolean;
  bookmarked: boolean;
  notes?: string;
  updatedAt: number;
}

export interface SavedTopologyDesign {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  targetRps: number;
  createdAt: number;
  updatedAt: number;
}

export interface TempUnlockEntry {
  featureKey: string;
  expiresAt: number;
}

export interface ProStatusRecord {
  id: string; // 'status'
  isPro: boolean;
  proUnlockedAt?: number;
  tempUnlocks: TempUnlockEntry[];
}
