import React from 'react';
import { TimelineRow as ITimelineRow, getRowTypeLabel, isWeekendDate } from '../utils/timelineUtils';
import { CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import EventBar from './EventBar';
import './TimelineRow.css';

interface TimelineRowProps {
  row: ITimelineRow;
  events: CalendarEvent[];
  calendars: CalendarInfo[];
  visibleCalendarIds: string[];
}

const TimelineRowComponent: React.FC<TimelineRowProps> = ({ row, events, calendars, visibleCalendarIds }) => {
  const typeLabel = getRowTypeLabel(row.type);
  const isDay = row.type === 'day';
  const weekend = isDay && isWeekendDate(row.startDate);

  const rowClasses = [
    'timeline-row',
    `timeline-row--${row.type}`,
    row.isToday ? 'timeline-row--today' : '',
    weekend ? 'timeline-row--weekend' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rowClasses}>
      <div className="timeline-row__type">
        {typeLabel && <span className="type-label">{typeLabel}</span>}
      </div>
      <div className="timeline-row__date">
        {isDay ? (
          <>
            <span className="date-main">{row.label}</span>
            <span className={`date-day${weekend ? ' date-day--weekend' : ''}`}>
              {row.dayLabel}
            </span>
          </>
        ) : row.type === 'week' ? (
          <>
            <span className="date-main">{row.label}</span>
            <span className="date-day">{row.dayLabel}</span>
            <span className="date-suffix">{row.suffix}</span>
          </>
        ) : (
          <>
            <span className="date-main">{row.label}</span>
            {row.suffix && <span className="date-suffix">{row.suffix}</span>}
          </>
        )}
      </div>
      <div className="timeline-row__events">
        <EventBar events={events} calendars={calendars} visibleCalendarIds={visibleCalendarIds} startDate={row.startDate} endDate={row.endDate} />
      </div>
    </div>
  );
};

export default TimelineRowComponent;
