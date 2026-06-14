import React, { useMemo } from 'react';
import { CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import {
  addMonths, addDays, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isToday, format,
} from 'date-fns';
import './CalendarGrid.css';

const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
};

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

type Row =
  | { type: 'header'; label: string }
  | { type: 'week'; days: Date[] };

function parseDate(str: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(str);
}

function eventColor(ev: CalendarEvent, calendars: CalendarInfo[]): string {
  if (ev.colorId && COLOR_MAP[ev.colorId]) return COLOR_MAP[ev.colorId];
  return calendars.find(c => c.id === ev.calendarId)?.backgroundColor ?? '#4dd0e1';
}

interface Props {
  events: CalendarEvent[];
  calendars: CalendarInfo[];
  visibleCalendarIds: string[];
}

const CalendarGrid: React.FC<Props> = ({ events, calendars, visibleCalendarIds }) => {
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => startOfMonth(today), [today]);

  const rows = useMemo((): Row[] => {
    const result: Row[] = [];
    const end = endOfWeek(endOfMonth(addMonths(today, 11)), { weekStartsOn: 1 });
    let current = startOfWeek(monthStart, { weekStartsOn: 1 });
    const seenMonths = new Set<string>();

    while (current <= end) {
      const week = Array.from({ length: 7 }, (_, i) => addDays(current, i));

      const firstOfMonth = week.find(d => d.getDate() === 1);
      if (firstOfMonth) {
        const key = format(firstOfMonth, 'yyyy-MM');
        if (!seenMonths.has(key)) {
          seenMonths.add(key);
          result.push({ type: 'header', label: format(firstOfMonth, 'yyyy年M月') });
        }
      }

      result.push({ type: 'week', days: week });
      current = addDays(current, 7);
    }

    return result;
  }, [today, monthStart]);

  const filtered = useMemo(
    () => events.filter(ev => visibleCalendarIds.includes(ev.calendarId)),
    [events, visibleCalendarIds],
  );

  const eventsForDay = (day: Date): CalendarEvent[] => {
    const s = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const e = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    return filtered.filter(ev => parseDate(ev.start) < e && parseDate(ev.end) > s);
  };

  return (
    <div className="cg-wrap">
      <div className="cg-dow-header">
        {DOW.map((d, di) => (
          <div key={d} className={`cg-dow${di === 5 ? ' cg-dow--sat' : di === 6 ? ' cg-dow--sun' : ''}`}>{d}</div>
        ))}
      </div>
      <div className="cg-weeks">
        {rows.map((row, ri) => {
          if (row.type === 'header') {
            return (
              <div key={`h-${ri}`} className="cg-month-label">{row.label}</div>
            );
          }
          return (
            <React.Fragment key={`w-${ri}`}>
              {row.days.map((day, di) => {
                const tod = isToday(day);
                const isOut = day < monthStart;
                const dow = day.getDay();
                const dayEvs = isOut ? [] : eventsForDay(day);
                return (
                  <div
                    key={di}
                    className={`cg-day${tod ? ' cg-day--today' : ''}${isOut ? ' cg-day--out' : ''}`}
                  >
                    <span className={`cg-day__num${dow === 0 ? ' cg-day__num--sun' : dow === 6 ? ' cg-day__num--sat' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="cg-day__evs">
                      {dayEvs.slice(0, 3).map(ev => (
                        <a
                          key={ev.id}
                          href={ev.htmlLink ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cg-ev"
                          style={{ background: eventColor(ev, calendars) }}
                          title={ev.summary}
                        >
                          {ev.summary}
                        </a>
                      ))}
                      {dayEvs.length > 3 && (
                        <div className="cg-ev-more">+{dayEvs.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarGrid;
