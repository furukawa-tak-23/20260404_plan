import React, { useRef, useEffect } from 'react';
import { CalendarInfo } from '../hooks/useGoogleCalendar';
import { RowType } from '../utils/timelineUtils';
import './ZoneSettingsPanel.css';

const ZONES: RowType[] = ['day', 'week', 'month', 'quarter', 'year', 'decade'];

const ZONE_LABELS: Record<RowType, string> = {
  day: '日',
  week: '週',
  month: '月',
  quarter: '四半期',
  year: '年',
  decade: '10年',
};

interface ZoneSettingsPanelProps {
  calendars: CalendarInfo[];
  zoneSelection: Record<RowType, string[]>;
  onChange: (zoneSelection: Record<RowType, string[]>) => void;
  onClose: () => void;
}

const ZoneSettingsPanel: React.FC<ZoneSettingsPanelProps> = ({
  calendars,
  zoneSelection,
  onChange,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const toggle = (zone: RowType, calId: string) => {
    const current = zoneSelection[zone] ?? [];
    const next = current.includes(calId)
      ? current.filter(id => id !== calId)
      : [...current, calId];
    onChange({ ...zoneSelection, [zone]: next });
  };

  const toggleAll = (zone: RowType) => {
    const current = zoneSelection[zone] ?? [];
    const next = current.length === calendars.length ? [] : calendars.map(c => c.id);
    onChange({ ...zoneSelection, [zone]: next });
  };

  return (
    <div className="zone-settings-panel" ref={ref}>
      <div className="zone-settings-panel__header">
        <span>ゾーン別カレンダー設定</span>
        <button className="zone-settings-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="zone-settings-panel__body">
        <table className="zone-settings-table">
          <thead>
            <tr>
              <th className="zone-settings-table__zone-col"></th>
              {calendars.map(cal => (
                <th key={cal.id} className="zone-settings-table__cal-col">
                  <span
                    className="zone-settings-table__cal-dot"
                    style={{ backgroundColor: cal.backgroundColor }}
                    title={cal.summary}
                  />
                  <span className="zone-settings-table__cal-name">{cal.summary}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ZONES.map(zone => {
              const selected = zoneSelection[zone] ?? [];
              const allChecked = selected.length === calendars.length;
              const someChecked = selected.length > 0 && !allChecked;
              return (
                <tr key={zone}>
                  <td className="zone-settings-table__zone-label">
                    <label className="zone-settings-table__all-label">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={el => { if (el) el.indeterminate = someChecked; }}
                        onChange={() => toggleAll(zone)}
                      />
                      {ZONE_LABELS[zone]}
                    </label>
                  </td>
                  {calendars.map(cal => (
                    <td key={cal.id} className="zone-settings-table__cell">
                      <input
                        type="checkbox"
                        checked={selected.includes(cal.id)}
                        onChange={() => toggle(zone, cal.id)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ZoneSettingsPanel;
