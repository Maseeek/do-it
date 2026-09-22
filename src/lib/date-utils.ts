export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// ISO week number
export function getISOWeek(date: Date): { year: number; week: number } {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { year: date.getFullYear(), week };
}

export function getWeekKey(dateStr: string = getTodayDateString()): string {
  const d = parseDate(dateStr);
  const { year, week } = getISOWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function getMonthKey(dateStr: string = getTodayDateString()): string {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

export function getYearKey(dateStr: string = getTodayDateString()): string {
  return dateStr.split('-')[0];
}

export function isDateInCurrentWeek(dateStr: string): boolean {
  return getWeekKey(dateStr) === getWeekKey(getTodayDateString());
}

export function isDateInCurrentMonth(dateStr: string): boolean {
  return getMonthKey(dateStr) === getMonthKey(getTodayDateString());
}

export function isDateInCurrentYear(dateStr: string): boolean {
  return getYearKey(dateStr) === getYearKey(getTodayDateString());
}

export function formatFriendlyDate(dateStr: string): string {
  const date = parseDate(dateStr);
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  if (dateStr === yStr) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getDaysRemainingInWeek(): { days: number; hours: number } {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const endOfSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
  const diffMs = Math.max(0, endOfSunday.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { days, hours };
}

export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateString(d);
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDateString();
}

// Generate the 7 days of the current calendar week (Monday to Sunday)
export function getCurrentWeekDays(selectedDateStr: string = getTodayDateString()) {
  const ref = parseDate(selectedDateStr);
  const day = ref.getDay(); // 0 is Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(ref);
  monday.setDate(ref.getDate() + mondayOffset);

  const days: {
    dateStr: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isSelected: boolean;
    isFuture: boolean;
  }[] = [];

  const today = getTodayDateString();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dStr = formatDateString(cur);

    days.push({
      dateStr: dStr,
      dayName: dayNames[i],
      dayNumber: cur.getDate(),
      isToday: dStr === today,
      isSelected: dStr === selectedDateStr,
      isFuture: dStr > today,
    });
  }

  return days;
}

// Heatmap matrix: default 12 weeks (84 days) up to today
export function getHeatmapDays(totalDays: number = 84): { dateStr: string; date: Date }[] {
  const result: { dateStr: string; date: Date }[] = [];
  const today = new Date();

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    result.push({
      dateStr: formatDateString(d),
      date: d,
    });
  }

  return result;
}

// Time-ago relative string (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
export function formatTimeAgo(isoString: string): string {
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}
