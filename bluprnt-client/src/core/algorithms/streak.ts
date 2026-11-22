/**
 * Daily Streak and Gamification Logic.
 * Handles streak increments, longest streak tracking, and streak freeze protections.
 */

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  freezeCount: number; // available freeze shields
  freezeUsedDates: string[]; // YYYY-MM-DD
}

export function formatDateToIsoDay(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export interface StreakUpdateResult {
  nextState: StreakState;
  streakIncremented: boolean;
  freezeConsumed: boolean;
  streakReset: boolean;
}

export function evaluateDailyStreak(
  currentState: StreakState,
  todayIso: string = formatDateToIsoDay()
): StreakUpdateResult {
  const { currentStreak, longestStreak, lastActiveDate, freezeCount, freezeUsedDates } = currentState;

  if (!lastActiveDate) {
    // First time user activity
    return {
      nextState: {
        currentStreak: 1,
        longestStreak: Math.max(1, longestStreak),
        lastActiveDate: todayIso,
        freezeCount,
        freezeUsedDates,
      },
      streakIncremented: true,
      freezeConsumed: false,
      streakReset: false,
    };
  }

  if (lastActiveDate === todayIso) {
    // Already recorded today, no-op
    return {
      nextState: currentState,
      streakIncremented: false,
      freezeConsumed: false,
      streakReset: false,
    };
  }

  // Calculate day difference
  const lastDate = new Date(lastActiveDate);
  const today = new Date(todayIso);
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) {
    // Consecutive day
    const nextCurrent = currentStreak + 1;
    return {
      nextState: {
        currentStreak: nextCurrent,
        longestStreak: Math.max(nextCurrent, longestStreak),
        lastActiveDate: todayIso,
        freezeCount,
        freezeUsedDates,
      },
      streakIncremented: true,
      freezeConsumed: false,
      streakReset: false,
    };
  } else if (diffDays === 2 && freezeCount > 0) {
    // Missed exactly 1 day, protect with streak freeze!
    const missedDate = new Date(lastDate);
    missedDate.setDate(missedDate.getDate() + 1);
    const missedDateIso = formatDateToIsoDay(missedDate);

    const nextCurrent = currentStreak + 1;
    return {
      nextState: {
        currentStreak: nextCurrent,
        longestStreak: Math.max(nextCurrent, longestStreak),
        lastActiveDate: todayIso,
        freezeCount: freezeCount - 1,
        freezeUsedDates: [...freezeUsedDates, missedDateIso],
      },
      streakIncremented: true,
      freezeConsumed: true,
      streakReset: false,
    };
  } else {
    // Gap > 1 day without freeze available -> reset streak
    return {
      nextState: {
        currentStreak: 1,
        longestStreak,
        lastActiveDate: todayIso,
        freezeCount,
        freezeUsedDates,
      },
      streakIncremented: false,
      freezeConsumed: false,
      streakReset: true,
    };
  }
}
