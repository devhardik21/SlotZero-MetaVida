import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Stethoscope, User } from 'lucide-react';

export const QuickDemoSwitch = ({ compact = false }) => {
  const { user, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  const demoAccounts = [
    {
      name: 'Dr. Meera Patel',
      email: 'meera@slotzero.io',
      role: 'DOCTOR',
      roleLabel: 'Doctor',
      timezone: 'Europe/London',
      tzLabel: 'London (GMT)',
      badge: '30m + 15m buffer',
      icon: Stethoscope,
    },
    {
      name: 'Dr. Alex Vance',
      email: 'alex@slotzero.io',
      role: 'DOCTOR',
      roleLabel: 'Doctor',
      timezone: 'America/New_York',
      tzLabel: 'New York (EDT/EST)',
      badge: '30m + 10m buffer',
      icon: Stethoscope,
    },
    {
      name: 'Asha Sharma',
      email: 'asha@slotzero.io',
      role: 'PATIENT',
      roleLabel: 'Patient',
      timezone: 'Asia/Kolkata',
      tzLabel: 'Kolkata (IST)',
      badge: 'Patient',
      icon: User,
    },
    {
      name: 'Sam Miller',
      email: 'sam@slotzero.io',
      role: 'PATIENT',
      roleLabel: 'Patient',
      timezone: 'America/New_York',
      tzLabel: 'New York (EDT/EST)',
      badge: 'Patient',
      icon: User,
    },
  ];

  const handleSwitch = async (acc) => {
    const res = await quickDemoLogin(acc.email);
    if (res.success) {
      if (acc.role === 'DOCTOR') {
        navigate('/doctor');
      } else {
        navigate('/patient');
      }
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mr-1">Demo Quick-Switch:</span>
        {demoAccounts.map((acc) => {
          const isActive = user?.email === acc.email;
          const Icon = acc.icon;
          return (
            <button
              key={acc.email}
              onClick={() => handleSwitch(acc)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                isActive
                  ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-medium'
                  : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300'
              }`}
              title={`Switch session to ${acc.name} (${acc.tzLabel})`}
            >
              <Icon className="w-3 h-3 text-neutral-500" />
              <span>{acc.name.split(' ')[0] + ' ' + (acc.name.split(' ')[1] || '')}</span>
              <span className="text-[10px] text-neutral-400 font-mono">[{acc.tzLabel.split(' ')[0]}]</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-0.5"></span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 text-neutral-200 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-neutral-200 tracking-wide uppercase font-mono">
            Hackathon Evaluator Quick-Switch
          </span>
        </div>
        <span className="text-[11px] text-neutral-400 font-mono">1-Click Live Switcher</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {demoAccounts.map((acc) => {
          const isActive = user?.email === acc.email;
          const Icon = acc.icon;
          return (
            <button
              key={acc.email}
              onClick={() => handleSwitch(acc)}
              className={`text-left p-2.5 rounded border transition-all ${
                isActive
                  ? 'bg-neutral-800 border-emerald-500 shadow-sm'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                  <Icon className="w-3 h-3" />
                  {acc.roleLabel}
                </span>
                <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400 font-mono">
                  {acc.tzLabel.split(' ')[0]}
                </span>
              </div>
              <div className="font-medium text-xs text-white truncate">{acc.name}</div>
              <div className="text-[11px] text-neutral-400 truncate mt-0.5 font-mono">{acc.badge}</div>
              {isActive && (
                <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Session
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
