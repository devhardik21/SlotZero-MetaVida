import React from 'react';
import { Globe } from 'lucide-react';

export const SUPPORTED_TIMEZONES = [
  { id: 'Asia/Kolkata', label: 'Asia/Kolkata (IST • UTC+5:30)', short: 'IST' },
  { id: 'Europe/London', label: 'Europe/London (GMT/BST • UTC+0/+1)', short: 'London' },
  { id: 'America/New_York', label: 'America/New_York (EST/EDT • UTC-5/-4)', short: 'New York' },
];

export const TimezoneSelector = ({
  value,
  onChange,
  className = '',
  label = 'Viewing Timezone',
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-[11px] font-mono text-neutral-600 uppercase tracking-wider mb-1 flex items-center gap-1">
          <Globe className="w-3 h-3 text-emerald-700" />
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono shadow-sm"
      >
        {SUPPORTED_TIMEZONES.map((tz) => (
          <option key={tz.id} value={tz.id}>
            {tz.label}
          </option>
        ))}
      </select>
    </div>
  );
};
