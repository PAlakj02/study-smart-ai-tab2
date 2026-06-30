/** Normalize any date string to "YYYY-MM-DD" */
function toDay(dateStr: string): string {
  return dateStr.substring(0, 10);
}

interface SessionLike {
  date: string;
  completed?: boolean;
  status?: string;
}

/** Returns sorted unique "YYYY-MM-DD" strings where at least one session was completed */
export function getCompletedStudyDates(sessions: SessionLike[]): string[] {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.completed === true || s.status === 'completed') {
      days.add(toDay(s.date));
    }
  }
  return Array.from(days).sort();
}

/** Days between two "YYYY-MM-DD" strings */
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/** Current streak: consecutive completed days ending today or yesterday */
export function calculateCurrentStreak(sessions: SessionLike[]): number {
  const days = getCompletedStudyDates(sessions);
  if (days.length === 0) return 0;

  const today = toDay(new Date().toISOString());
  const latest = days[days.length - 1];

  // If the most recent completed day isn't today or yesterday, streak is broken
  const gap = daysBetween(latest, today);
  if (gap > 1) return 0;

  let streak = 1;
  for (let i = days.length - 2; i >= 0; i--) {
    if (daysBetween(days[i], days[i + 1]) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Best streak: longest consecutive completed-day run across all history */
export function calculateBestStreak(sessions: SessionLike[]): number {
  const days = getCompletedStudyDates(sessions);
  if (days.length === 0) return 0;

  let best = 1;
  let run  = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}
