import React, { useState, useRef, useEffect } from 'react';
import { CalendarInfo } from '../hooks/useGoogleCalendar';
import './CalendarSelector.css';

interface CalendarSelectorProps {
  calendars: CalendarInfo[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const CalendarSelector: React.FC<CalendarSelectorProps> = ({ calendars, selectedIds, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(s => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="calendar-selector" ref={ref}>
      <button className="btn btn--ghost" onClick={() => setOpen(v => !v)}>
        カレンダー {selectedIds.length}/{calendars.length}
      </button>
      {open && (
        <div className="calendar-selector__dropdown">
          {calendars.map(cal => (
            <label key={cal.id} className="calendar-selector__item">
              <input
                type="checkbox"
                checked={selectedIds.includes(cal.id)}
                onChange={() => toggle(cal.id)}
              />
              <span
                className="calendar-selector__color"
                style={{ backgroundColor: cal.backgroundColor }}
              />
              <span className="calendar-selector__name">{cal.summary}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default CalendarSelector;
