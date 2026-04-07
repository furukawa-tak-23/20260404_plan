import {
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  startOfWeek,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  isSameDay,
  format,
  getDay,
} from 'date-fns';

export type RowType = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'decade';

export interface TimelineRow {
  type: RowType;
  startDate: Date;
  endDate: Date;
  isToday?: boolean;
  label: string;
  dayLabel?: string;
  suffix?: string;
}

const JP_DAYS = ['日', '月', '火', '水', '木', '金', '土'];

function getDayLabel(date: Date): string {
  return `（${JP_DAYS[getDay(date)]}）`;
}

function isWeekend(date: Date): boolean {
  const d = getDay(date);
  return d === 0 || d === 6;
}

export function isWeekendDate(date: Date): boolean {
  return isWeekend(date);
}

export function generateTimelineRows(today: Date): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const todayStart = startOfDay(today);

  // Day rows: from 7 days before today to 12 days after today
  const dayStart = addDays(todayStart, -7);
  const dayEnd = addDays(todayStart, 12);

  let cursor = dayStart;
  while (cursor <= dayEnd) {
    const dayOfMonth = cursor.getDate();
    const month = cursor.getMonth() + 1;
    rows.push({
      type: 'day',
      startDate: cursor,
      endDate: endOfDay(cursor),
      isToday: isSameDay(cursor, today),
      label: `${month}/${dayOfMonth}`,
      dayLabel: getDayLabel(cursor),
    });
    cursor = addDays(cursor, 1);
  }

  // Week rows: 13 days after today to 56 days (8 weeks) after today
  // Start from the Monday of the week containing day+13
  const weekRangeStart = addDays(todayStart, 13);
  const weekRangeEnd = addDays(todayStart, 56);

  let weekCursor = startOfWeek(weekRangeStart, { weekStartsOn: 1 });
  while (weekCursor <= weekRangeEnd) {
    const weekEnd = endOfWeek(weekCursor, { weekStartsOn: 1 });
    const month = weekCursor.getMonth() + 1;
    const dayOfMonth = weekCursor.getDate();
    rows.push({
      type: 'week',
      startDate: weekCursor,
      endDate: weekEnd,
      label: `${month}/${dayOfMonth}`,
      dayLabel: getDayLabel(weekCursor),
      suffix: '〜',
    });
    weekCursor = addWeeks(weekCursor, 1);
  }

  // Month rows: ~2 months to ~6 months after today
  const monthRangeStart = addDays(todayStart, 57);
  const monthRangeEnd = addMonths(todayStart, 6);

  let monthCursor = startOfMonth(monthRangeStart);
  // Make sure we don't overlap with week rows
  if (monthCursor < monthRangeStart) {
    monthCursor = startOfMonth(addMonths(monthRangeStart, 1));
    if (monthCursor > monthRangeStart) {
      monthCursor = startOfMonth(monthRangeStart);
    }
  }

  while (monthCursor <= monthRangeEnd) {
    const mEnd = endOfMonth(monthCursor);
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth() + 1;
    rows.push({
      type: 'month',
      startDate: monthCursor,
      endDate: mEnd,
      label: `${year}/${month}`,
    });
    monthCursor = addMonths(monthCursor, 1);
  }

  // Quarter rows: ~6 months to ~24 months after today
  const quarterRangeStart = addMonths(todayStart, 6);
  const quarterRangeEnd = addMonths(todayStart, 24);

  let quarterCursor = startOfQuarter(quarterRangeStart);
  // Advance to next quarter if this one starts before range
  if (quarterCursor < quarterRangeStart) {
    quarterCursor = startOfQuarter(addQuarters(quarterRangeStart, 1));
  }

  while (quarterCursor <= quarterRangeEnd) {
    const qEnd = endOfQuarter(quarterCursor);
    const year = quarterCursor.getFullYear();
    const month = quarterCursor.getMonth() + 1;
    rows.push({
      type: 'quarter',
      startDate: quarterCursor,
      endDate: qEnd,
      label: `${year}/${month}`,
      suffix: '〜',
    });
    quarterCursor = addQuarters(quarterCursor, 1);
  }

  // Year rows: ~2 years to ~15 years after today
  const yearRangeStart = addMonths(todayStart, 24);
  const yearRangeEnd = addYears(todayStart, 15);

  let yearCursor = startOfYear(yearRangeStart);
  if (yearCursor < yearRangeStart) {
    yearCursor = startOfYear(addYears(yearRangeStart, 1));
  }

  while (yearCursor <= yearRangeEnd) {
    const yEnd = endOfYear(yearCursor);
    rows.push({
      type: 'year',
      startDate: yearCursor,
      endDate: yEnd,
      label: `${yearCursor.getFullYear()}`,
    });
    yearCursor = addYears(yearCursor, 1);
  }

  // Decade rows: ~15 years to 200 years after today
  const decadeRangeStart = addYears(todayStart, 15);
  const decadeRangeEnd = addYears(todayStart, 200);

  // Find the start of the first decade period
  const firstDecadeYear = Math.ceil(decadeRangeStart.getFullYear() / 10) * 10;
  let decadeCursor = new Date(firstDecadeYear, 0, 1);
  if (decadeCursor < decadeRangeStart) {
    decadeCursor = new Date(firstDecadeYear + 10, 0, 1);
  }

  while (decadeCursor <= decadeRangeEnd) {
    const decadeEnd = new Date(decadeCursor.getFullYear() + 10, 0, 0);
    rows.push({
      type: 'decade',
      startDate: decadeCursor,
      endDate: decadeEnd,
      label: `${decadeCursor.getFullYear()}`,
      suffix: '〜',
    });
    decadeCursor = new Date(decadeCursor.getFullYear() + 10, 0, 1);
  }

  return rows;
}

export function getRowTypeLabel(type: RowType): string {
  switch (type) {
    case 'day': return '';
    case 'week': return 'Week';
    case 'month': return 'Month';
    case 'quarter': return 'Quarter';
    case 'year': return 'Year';
    case 'decade': return '10Years';
  }
}

export function formatDateRange(row: TimelineRow): string {
  if (row.type === 'day') {
    return row.label + (row.dayLabel ?? '');
  }
  return row.label + (row.suffix ?? '');
}

export { format };
