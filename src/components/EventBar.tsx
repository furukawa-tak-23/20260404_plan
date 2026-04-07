import React from 'react';
import { CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import { parseISO } from 'date-fns';
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
}

const EventBar: React.FC<EventBarProps> = ({ events, calendars, visibleCalendarIds, startDate, endDate }) => {
  const rangeEvents = eventsInRange(events, startDate, endDate).filter(ev =>
    visibleCalendarIds.includes(ev.calendarId)
  );

  if (rangeEvents.length === 0) {
    return <div className="event-bar-area" />;
  }

  return (
    <div className="event-bar-area">
      {rangeEvents.map((ev) => (
        <a
          key={ev.id}
          href={ev.htmlLink ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="event-pill"
          style={{ backgroundColor: getEventColor(ev, calendars) }}
          title={ev.summary}
        >
          <span className="event-pill-text">{ev.summary}</span>
        </a>
      ))}
    </div>
  );
};

export default EventBar;
