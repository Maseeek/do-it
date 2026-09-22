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
