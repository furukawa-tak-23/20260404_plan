import React from 'react';
import { CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import { parseISO, format } from 'date-fns';
import './EventBar.css';

// Google Calendar color palette
const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', // Lavender
  '2': '#33b679', // Sage
  '3': '#8e24aa', // Grape
  '4': '#e67c73', // Flamingo
  '5': '#f6c026', // Banana
  '6': '#f5511d', // Tangerine
  '7': '#039be5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d60000', // Tomato
};

function getEventColor(event: CalendarEvent, calendars: CalendarInfo[]): string {
  if (event.colorId && COLOR_MAP[event.colorId]) {
    return COLOR_MAP[event.colorId];
  }
  const calendar = calendars.find(c => c.id === event.calendarId);
  return calendar?.backgroundColor ?? '#4dd0e1';
}

function parseEventDate(dateStr: string): Date {
  // date-only strings like "2026-04-05" need to be treated as local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return parseISO(dateStr);
}

function isAllDayEvent(ev: CalendarEvent): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(ev.start);
}

function formatStartTime(start: string): string {
  return format(parseISO(start), 'H:mm');
}

function dateFormat(rowType: string): string {
  return rowType === 'decade' ? 'yyyy/M/d' : 'M/d';
}

function formatAllDayDateLabel(start: string, end: string, rowType: string): string | null {
  const startDate = parseEventDate(start);
  // Google Calendar の終日予定の end は exclusive（最終日の翌日）なので1日引く
  const endParsed = parseEventDate(end);
  const lastDay = new Date(endParsed.getFullYear(), endParsed.getMonth(), endParsed.getDate() - 1);
  const isMultiDay = lastDay > startDate;
  const fmt = dateFormat(rowType);

  if (rowType === 'day') {
    // 日単位ゾーンでは複数日の場合のみ終了日を表示
    return isMultiDay ? `～${format(lastDay, 'M/d')}` : null;
  } else {
    // 日単位以外は開始日を常に表示し、複数日なら範囲で表示
    return isMultiDay
      ? `${format(startDate, fmt)}～${format(lastDay, fmt)}`
      : format(startDate, fmt);
  }
}

function formatTimedDateLabel(start: string, rowType: string): string {
  return format(parseEventDate(start), dateFormat(rowType));
}

function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const aStart = parseEventDate(a.start);
    const bStart = parseEventDate(b.start);
    // 1. 日付順（日付部分のみで比較）
    const aDay = new Date(aStart.getFullYear(), aStart.getMonth(), aStart.getDate()).getTime();
    const bDay = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate()).getTime();
    if (aDay !== bDay) return aDay - bDay;
    // 2. 終日予定を先に
    const aAllDay = isAllDayEvent(a);
    const bAllDay = isAllDayEvent(b);
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;
    // 3. 非終日は開始時間順
    return aStart.getTime() - bStart.getTime();
  });
}

function eventsInRange(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
  return events.filter((ev) => {
    const evStart = parseEventDate(ev.start);
    const evEnd = parseEventDate(ev.end);
    // Event overlaps with [start, end] if evStart < end && evEnd > start
    return evStart < end && evEnd > start;
  });
}

interface EventBarProps {
  events: CalendarEvent[];
  calendars: CalendarInfo[];
  visibleCalendarIds: string[];
  startDate: Date;
  endDate: Date;
  rowType: string;
}

const EventBar: React.FC<EventBarProps> = ({ events, calendars, visibleCalendarIds, startDate, endDate, rowType }) => {
  const rangeEvents = sortEvents(
    eventsInRange(events, startDate, endDate).filter(ev =>
      visibleCalendarIds.includes(ev.calendarId)
    )
  );

  if (rangeEvents.length === 0) {
    return <div className="event-bar-area" />;
  }

  const isDay = rowType === 'day';

  return (
    <div className="event-bar-area">
      {rangeEvents.map((ev) => {
        const allDay = isAllDayEvent(ev);
        const color = getEventColor(ev, calendars);
        const startTime = !allDay ? formatStartTime(ev.start) : null;

        if (allDay) {
          const dateLabel = formatAllDayDateLabel(ev.start, ev.end, rowType);
          return (
            <a
              key={ev.id}
              href={ev.htmlLink ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="event-pill"
              style={{ backgroundColor: color }}
              title={ev.summary}
            >
              {dateLabel && <span className="event-date">{dateLabel}</span>}
              <span className="event-pill-text">{ev.summary}</span>
            </a>
          );
        } else {
          const dateLabel = !isDay ? formatTimedDateLabel(ev.start, rowType) : null;
          return (
            <a
              key={ev.id}
              href={ev.htmlLink ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="event-pill event-pill--timed"
              title={ev.summary}
            >
              <span className="event-dot" style={{ backgroundColor: color }} />
              {dateLabel && <span className="event-date">{dateLabel}</span>}
              {startTime && <span className="event-time">{startTime}</span>}
              <span className="event-pill-text">{ev.summary}</span>
            </a>
          );
        }
      })}
    </div>
  );
};

export default EventBar;
