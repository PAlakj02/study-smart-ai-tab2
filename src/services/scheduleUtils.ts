export interface SchedulingParams {
  availableStudyDays: number[];   // 0=Sun … 6=Sat
  preferredStartTime: string;     // "HH:MM"
  preferredEndTime: string;       // "HH:MM"
  breakLengthMinutes: number;
}

export interface OccupiedSlot {
  date: string;       // "YYYY-MM-DD"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}

function parseMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Find the earliest available study slot after `fromDate`, skipping days not in
 * availableStudyDays and avoiding overlap with existing occupied slots.
 * Returns null if no slot found within 60 days.
 */
export function findNextAvailableSlot(
  occupied: OccupiedSlot[],
  params: SchedulingParams,
  fromDate: Date,
  durationMinutes: number,
): { date: string; startTime: string; endTime: string } | null {
  const { availableStudyDays, preferredStartTime, preferredEndTime, breakLengthMinutes } = params;
  const windowStart = parseMinutes(preferredStartTime);
  const windowEnd   = parseMinutes(preferredEndTime);

  // Index occupied slots by date for O(1) per-day lookup
  const byDate = new Map<string, { s: number; e: number }[]>();
  for (const o of occupied) {
    if (!o.startTime || !o.endTime) continue;
    const key = o.date.substring(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push({ s: parseMinutes(o.startTime), e: parseMinutes(o.endTime) });
  }

  for (let offset = 1; offset <= 60; offset++) {
    const d = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + offset);
    if (!availableStudyDays.includes(d.getDay())) continue;

    const dateStr = toLocalDateStr(d);
    const slots = (byDate.get(dateStr) ?? []).sort((a, b) => a.s - b.s);

    // Walk the preferred window finding the first gap that fits
    let cursor = windowStart;
    while (cursor + durationMinutes <= windowEnd) {
      const end = cursor + durationMinutes;
      // A conflict exists if [cursor, end] overlaps [o.s - break, o.e + break]
      const conflict = slots.find(o => cursor < o.e + breakLengthMinutes && end + breakLengthMinutes > o.s);
      if (!conflict) {
        return { date: dateStr, startTime: toTimeStr(cursor), endTime: toTimeStr(end) };
      }
      // Jump past the conflict
      cursor = conflict.e + breakLengthMinutes;
    }
  }

  return null;
}

/**
 * Same slot-search as findNextAvailableSlot, but bounded to [minDate, maxDate]
 * inclusive instead of a rolling 60-day window — used to find a genuinely
 * free slot inside a roadmap's own reserved buffer/catch-up week rather than
 * wherever is soonest across the whole calendar.
 */
export function findAvailableSlotInRange(
  occupied: OccupiedSlot[],
  params: SchedulingParams,
  minDate: string,
  maxDate: string,
  durationMinutes: number,
): { date: string; startTime: string; endTime: string } | null {
  const { availableStudyDays, preferredStartTime, preferredEndTime, breakLengthMinutes } = params;
  const windowStart = parseMinutes(preferredStartTime);
  const windowEnd = parseMinutes(preferredEndTime);

  const byDate = new Map<string, { s: number; e: number }[]>();
  for (const o of occupied) {
    if (!o.startTime || !o.endTime) continue;
    const key = o.date.substring(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push({ s: parseMinutes(o.startTime), e: parseMinutes(o.endTime) });
  }

  const [minY, minM, minD] = minDate.split('-').map(Number);
  const [maxY, maxM, maxD] = maxDate.split('-').map(Number);
  const end = new Date(maxY, maxM - 1, maxD);

  for (const d = new Date(minY, minM - 1, minD); d <= end; d.setDate(d.getDate() + 1)) {
    if (!availableStudyDays.includes(d.getDay())) continue;

    const dateStr = toLocalDateStr(d);
    const slots = (byDate.get(dateStr) ?? []).sort((a, b) => a.s - b.s);

    let cursor = windowStart;
    while (cursor + durationMinutes <= windowEnd) {
      const slotEnd = cursor + durationMinutes;
      const conflict = slots.find(o => cursor < o.e + breakLengthMinutes && slotEnd + breakLengthMinutes > o.s);
      if (!conflict) {
        return { date: dateStr, startTime: toTimeStr(cursor), endTime: toTimeStr(slotEnd) };
      }
      cursor = conflict.e + breakLengthMinutes;
    }
  }

  return null;
}
