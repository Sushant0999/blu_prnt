import Dexie, { type Table } from 'dexie';
import type {
  LessonProgress,
  StreakRecord,
  SrsCardRecord,
  CaseStudyProgress,
  InterviewProgress,
  SavedTopologyDesign,
  ProStatusRecord,
} from '../types/storage';

export class BluPrntDatabase extends Dexie {
  lessons!: Table<LessonProgress, string>;
  streak!: Table<StreakRecord, string>;
  srsCards!: Table<SrsCardRecord, string>;
  caseStudies!: Table<CaseStudyProgress, string>;
  interviews!: Table<InterviewProgress, string>;
  designs!: Table<SavedTopologyDesign, string>;
  proStatus!: Table<ProStatusRecord, string>;

  constructor() {
    super('BluPrntDatabase');
    this.version(1).stores({
      lessons: '&lessonId, completed, lastStudiedAt',
      streak: '&id',
      srsCards: '&cardId, deckId, dueDate, lastReviewedAt',
      caseStudies: '&caseId, studied, bookmarked',
      interviews: '&promptId, practiced, bookmarked',
      designs: '&id, name, updatedAt',
      proStatus: '&id',
    });
  }
}

export const db = new BluPrntDatabase();

export async function initializeDatabaseDefaults(): Promise<void> {
  const existingStreak = await db.streak.get('main');
  if (!existingStreak) {
    await db.streak.put({
      id: 'main',
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: '',
      freezeCount: 2,
      activeDates: [],
    });
  }

  const existingPro = await db.proStatus.get('status');
  if (!existingPro) {
    await db.proStatus.put({
      id: 'status',
      isPro: false,
      tempUnlocks: [],
    });
  }
}
