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

// fromDate から数えて n 番目の日曜日（fromDate 自身が日曜なら 1 番目）
function getNthSundayFrom(fromDate: Date, n: number): Date {
  let count = 0;
  let cursor = startOfDay(fromDate);
  while (true) {
    if (getDay(cursor) === 0) {
      count++;
      if (count === n) return cursor;
    }
    cursor = addDays(cursor, 1);
  }
}

// fromDate の月から数えて n 番目の月末
function getNthMonthEnd(fromDate: Date, n: number): Date {
  return endOfMonth(addMonths(startOfMonth(fromDate), n - 1));
}

// fromDate の月から数えて n 番目の「3 の倍数月（3,6,9,12 月）」の月末
function getNthMultiple3MonthEnd(fromDate: Date, n: number): Date {
  let count = 0;
  let cursor = startOfMonth(fromDate);
  while (true) {
    if ((cursor.getMonth() + 1) % 3 === 0) {
      count++;
      if (count === n) return endOfMonth(cursor);
    }
    cursor = addMonths(cursor, 1);
  }
}

// fromDate の年から数えて n 番目の年末
function getNthYearEnd(fromDate: Date, n: number): Date {
  return endOfYear(new Date(fromDate.getFullYear() + n - 1, 0, 1));
}

// fromDate の年以降で n 番目の「10 の倍数年」の年末
function getNthMultiple10YearEnd(fromDate: Date, n: number): Date {
  const firstYear = Math.ceil(fromDate.getFullYear() / 10) * 10;
  return endOfYear(new Date(firstYear + (n - 1) * 10, 0, 1));
}

// fromDate の年以降で n 番目の「100 の倍数年」の年末
function getNthMultiple100YearEnd(fromDate: Date, n: number): Date {
  const firstYear = Math.ceil(fromDate.getFullYear() / 100) * 100;
  return endOfYear(new Date(firstYear + (n - 1) * 100, 0, 1));
}

export function generateTimelineRows(today: Date): TimelineRow[] {
  const rows: TimelineRow[] = [];
  const todayStart = startOfDay(today);

  // === 日ゾーン ===
  // 開始: 今日の 7 日前
  // 終了: 今日から数えて 2 番目の日曜日
  const dayZoneStart = addDays(todayStart, -7);
  const dayZoneEnd = getNthSundayFrom(todayStart, 2);

  let cursor = dayZoneStart;
  while (cursor <= dayZoneEnd) {
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

  // === 週ゾーン ===
  // 開始: 日ゾーン最終日の翌日（月曜）
  // 終了: そこから数えて 2 番目の月末
  const weekZoneStart = addDays(dayZoneEnd, 1);
  const weekZoneEnd = getNthMonthEnd(weekZoneStart, 2);

  let weekCursor = startOfWeek(weekZoneStart, { weekStartsOn: 1 });
  while (weekCursor <= weekZoneEnd) {
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

  // === 月ゾーン ===
  // 開始: 週ゾーン最終日の翌日（月初）
  // 終了: そこから数えて 2 番目の「3 の倍数月」の月末
  const monthZoneStart = addDays(weekZoneEnd, 1);
  const monthZoneEnd = getNthMultiple3MonthEnd(monthZoneStart, 2);

  let monthCursor = startOfMonth(monthZoneStart);
  while (monthCursor <= monthZoneEnd) {
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

  // === 四半期ゾーン ===
  // 開始: 月ゾーン最終日の翌日（四半期初）
  // 終了: そこから数えて 2 番目の年末
  const quarterZoneStart = addDays(monthZoneEnd, 1);
  const quarterZoneEnd = getNthYearEnd(quarterZoneStart, 2);

  let quarterCursor = startOfQuarter(quarterZoneStart);
  while (quarterCursor <= quarterZoneEnd) {
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

  // === 年ゾーン ===
  // 開始: 四半期ゾーン最終日の翌日（年初）
  // 終了: そこから数えて 2 番目の「10 の倍数年」の年末
  const yearZoneStart = addDays(quarterZoneEnd, 1);
  const yearZoneEnd = getNthMultiple10YearEnd(yearZoneStart, 2);

  let yearCursor = startOfYear(yearZoneStart);
  while (yearCursor <= yearZoneEnd) {
    const yEnd = endOfYear(yearCursor);
    rows.push({
      type: 'year',
      startDate: yearCursor,
      endDate: yEnd,
      label: `${yearCursor.getFullYear()}`,
    });
    yearCursor = addYears(yearCursor, 1);
  }

  // === 10 年ゾーン ===
  // 開始: 年ゾーン最終日の翌日
  // 終了: そこから数えて 2 番目の「100 の倍数年」の年末
  const decadeZoneStart = addDays(yearZoneEnd, 1);
  const decadeZoneEnd = getNthMultiple100YearEnd(decadeZoneStart, 2);

  let decadeCursor = decadeZoneStart;
  while (decadeCursor <= decadeZoneEnd) {
    const year = decadeCursor.getFullYear();
    const decadeEnd = endOfYear(new Date(year + 9, 0, 1));
    rows.push({
      type: 'decade',
      startDate: decadeCursor,
      endDate: decadeEnd,
      label: `${year}`,
      suffix: '〜',
    });
    decadeCursor = new Date(year + 10, 0, 1);
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
