import { create } from 'zustand';
import { db } from '../db/database';
import type { LessonProgress } from '../types/storage';

interface ProgressState {
  progressMap: Record<string, LessonProgress>;
  isLoading: boolean;
  loadProgress: () => Promise<void>;
  markLessonComplete: (lessonId: string, quizScore?: number, quizTotal?: number) => Promise<void>;
  getLessonProgress: (lessonId: string) => LessonProgress | undefined;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progressMap: {},
  isLoading: true,

  loadProgress: async () => {
    try {
      const items = await db.lessons.toArray();
      const map: Record<string, LessonProgress> = {};
      for (const item of items) {
        map[item.lessonId] = item;
      }
      set({ progressMap: map, isLoading: false });
    } catch (err) {
      console.error('Failed to load lesson progress from DB:', err);
      set({ isLoading: false });
    }
  },

  markLessonComplete: async (lessonId: string, quizScore?: number, quizTotal?: number) => {
    const record: LessonProgress = {
      lessonId,
      completed: true,
      quizScore,
      quizTotal,
      lastStudiedAt: Date.now(),
    };

    await db.lessons.put(record);

    set((state) => ({
      progressMap: {
        ...state.progressMap,
        [lessonId]: record,
      },
    }));
  },

  getLessonProgress: (lessonId: string) => {
    return get().progressMap[lessonId];
  },
}));
