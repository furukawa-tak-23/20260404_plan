import React, { useMemo } from 'react';
import { CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import {
  addMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, format,
} from 'date-fns';
import './CalendarGrid.css';

const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
};

const DOW = ['日', '月', '火', '水', '木', '金', '土'];

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

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => addMonths(today, i)),
    [today],
  );

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
    <div className="cg-grid">
      {months.map((month, mi) => {
        const ms = startOfMonth(month);
        const me = endOfMonth(month);
        const days = eachDayOfInterval({
          start: startOfWeek(ms, { weekStartsOn: 0 }),
          end: endOfWeek(me, { weekStartsOn: 0 }),
        });
        return (
          <div key={mi} className="cg-month">
            <div className="cg-month__title">{format(month, 'yyyy年M月')}</div>
            <div className="cg-month__grid">
              {DOW.map((d, di) => (
                <div key={d} className={`cg-dow${di === 0 ? ' cg-dow--sun' : di === 6 ? ' cg-dow--sat' : ''}`}>{d}</div>
              ))}
              {days.map((day, di) => {
                const out = !isSameMonth(day, month);
                const tod = isToday(day);
                const dow = day.getDay();
                const dayEvs = out ? [] : eventsForDay(day);
                return (
                  <div key={di} className={`cg-day${out ? ' cg-day--out' : ''}${tod ? ' cg-day--today' : ''}`}>
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
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarGrid;
