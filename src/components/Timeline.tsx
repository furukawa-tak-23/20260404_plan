import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateTimelineRows, RowType } from '../utils/timelineUtils';
import { useGoogleCalendar, CalendarEvent, CalendarInfo } from '../hooks/useGoogleCalendar';
import TimelineRowComponent from './TimelineRow';
import ZoneSettingsPanel from './ZoneSettingsPanel';
import './Timeline.css';
import { addDays } from 'date-fns';

const ZONES: RowType[] = ['day', 'week', 'month', 'quarter', 'year', 'decade'];

const Timeline: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const rows = useMemo(() => generateTimelineRows(today), [today]);

  const { isSignedIn, isLoading, error, signIn, signOut, getCalendars, getEvents } = useGoogleCalendar();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [pastCollapsed, setPastCollapsed] = useState(true);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [zoneSelection, setZoneSelection] = useState<Record<RowType, string[]>>(() => {
    try {
      const saved = localStorage.getItem('zoneSelection');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { day: [], week: [], month: [], quarter: [], year: [], decade: [] };
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      if (!isLoading) {
        setCalendars([]);
        setEvents([]);
      }
      return;
    }
    getCalendars().then(list => {
      setCalendars(list);
      const allIds = list.map(c => c.id);
      const savedKnown: string[] = JSON.parse(localStorage.getItem('knownCalendarIds') ?? '[]');
      const trulyNewIds = allIds.filter(id => !savedKnown.includes(id));
      localStorage.setItem('knownCalendarIds', JSON.stringify([...new Set([...savedKnown, ...allIds])]));
      setZoneSelection(prev => {
        const merged = { ...prev };
        for (const zone of ZONES) {
          const existing = merged[zone] ?? [];
          merged[zone] = [...existing.filter(id => allIds.includes(id)), ...trulyNewIds];
        }
        return merged;
      });
    });
  }, [isSignedIn, isLoading, getCalendars]);

  useEffect(() => {
    try {
      localStorage.setItem('zoneSelection', JSON.stringify(zoneSelection));
    } catch {}
  }, [zoneSelection]);

  // フェッチ対象：全ゾーンの選択の和集合
  const fetchCalendarIds = useMemo(() => {
    const idSet = new Set<string>();
    Object.values(zoneSelection).forEach(ids => ids.forEach(id => idSet.add(id)));
    return [...idSet];
  }, [zoneSelection]);

  const fetchEvents = useCallback(async (calendarIds: string[]) => {
    if (calendarIds.length === 0) {
      setEvents([]);
      return;
    }
    setEventsLoading(true);
    try {
      const start = addDays(today, -7);
      const end = rows.length > 0 ? rows[rows.length - 1].endDate : addDays(today, 365);
      const fetched = await getEvents(start, end, calendarIds);
      setEvents(fetched);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setEventsLoading(false);
    }
  }, [getEvents, today, rows]);

  useEffect(() => {
    if (isSignedIn && fetchCalendarIds.length > 0) {
      fetchEvents(fetchCalendarIds);
    }
  }, [fetchCalendarIds, isSignedIn, fetchEvents]);

  return (
    <div className="timeline-container">
      <header className="timeline-header">
        <h1 className="timeline-title">Timeline</h1>
        <div className="timeline-auth">
          {isLoading ? (
            <span className="auth-loading">Loading...</span>
          ) : isSignedIn ? (
            <>
              {error && (
                <span className="auth-error" title={error}>
                  {error}
                </span>
              )}
              <div className="auth-signed-in">
                {eventsLoading && <span className="auth-loading">Syncing...</span>}
                <div style={{ position: 'relative' }}>
                  <button className="btn btn--ghost" onClick={() => setSettingsOpen(v => !v)}>
                    カレンダー設定
                  </button>
                  {settingsOpen && (
                    <ZoneSettingsPanel
                      calendars={calendars}
                      zoneSelection={zoneSelection}
                      onChange={setZoneSelection}
                      onClose={() => setSettingsOpen(false)}
                    />
                  )}
                </div>
                <button className="btn btn--secondary" onClick={signOut}>
                  Disconnect Calendar
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn--primary" onClick={signIn}>
              Connect Google Calendar
            </button>
          )}
        </div>
      </header>

      <div className="timeline-body">
        {/* Collapsed past section */}
        <div
          className={`timeline-past-section${pastCollapsed ? '' : ' timeline-past-section--expanded'}`}
          onClick={() => setPastCollapsed((v) => !v)}
        >
          <span className="past-section-icon">{pastCollapsed ? '▶' : '▼'}</span>
          <span className="past-section-label">1週間前以前</span>
        </div>

        {/* Timeline rows */}
        <div className="timeline-rows">
          {rows.map((row) => (
            <TimelineRowComponent
              key={`${row.type}-${row.startDate.toISOString()}`}
              row={row}
              events={events}
              calendars={calendars}
              visibleCalendarIds={zoneSelection[row.type] ?? []}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
