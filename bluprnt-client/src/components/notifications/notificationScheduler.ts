/**
 * Opt-in Browser Inactivity Notification Scheduler.
 * Uses the Web Notifications API to trigger non-intrusive retention nudges after periods of inactivity.
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications API not supported in this browser environment.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

export function checkAndNudgeInactivity(lastActiveTimestamp: number): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (now - lastActiveTimestamp >= sevenDaysMs) {
    new Notification('BluPrnt Streak Nudge 🔥', {
      body: 'Your System Design streak is waiting! Spend 3 minutes reviewing your flashcards or running a simulation.',
      icon: '/vite.svg',
      tag: 'bluprnt-streak-nudge',
    });
    return true;
  }

  return false;
}
