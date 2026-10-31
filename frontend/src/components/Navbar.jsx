import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QuickDemoSwitch } from './QuickDemoSwitch';
import { ShieldCheck, LogOut, Clock, Activity, User } from 'lucide-react';

export const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      {/* Top micro bar for quick demo switching */}
      <div className="bg-neutral-50 border-b border-neutral-200/80 px-4 py-1.5 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span className="font-mono text-[11px] text-neutral-600">
              SLOTZERO ENGINE: REPLICA SET TRANSACTIONS & 15-MIN QUANTIZED ATOMIC LOCKS ACTIVE
            </span>
          </div>
          <QuickDemoSwitch compact={true} />
        </div>
      </div>

      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-white font-mono font-bold text-sm tracking-tighter">
                SZ
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-neutral-900 tracking-tight text-base leading-none">
                  SlotZero
                </span>
                <span className="text-[10px] font-mono text-emerald-700 tracking-wider font-medium">
                  CLINICAL SCHEDULING
                </span>
              </div>
            </Link>

            {/* Nav links */}
            <nav className="hidden lg:flex items-center space-x-4 text-xs font-medium text-neutral-600">
              <Link
                to="/"
                className="hover:text-neutral-900 transition-colors px-2 py-1 rounded hover:bg-neutral-100"
              >
                Clinical Overview
              </Link>
              {role === 'DOCTOR' && (
                <Link
                  to="/doctor"
                  className="hover:text-neutral-900 transition-colors px-2 py-1 rounded hover:bg-neutral-100 text-emerald-800 font-semibold"
                >
                  Doctor Console
                </Link>
              )}
              {role === 'PATIENT' && (
                <Link
                  to="/patient"
                  className="hover:text-neutral-900 transition-colors px-2 py-1 rounded hover:bg-neutral-100 text-emerald-800 font-semibold"
                >
                  Patient Booking & Appointments
                </Link>
              )}
            </nav>
          </div>

          {/* Right side authentication & user details */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-neutral-900 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex items-center justify-end space-x-1.5 text-[11px] font-mono text-neutral-500">
                    <span className="uppercase text-emerald-800 font-medium">
                      {user.role}
                    </span>
                    <span>•</span>
                    <span className="text-neutral-600">{user.timezone}</span>
                  </div>
                </div>

                <Link
                  to={role === 'DOCTOR' ? '/doctor' : '/patient'}
                  className="px-2.5 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-300 rounded hover:bg-neutral-200 transition-colors"
                >
                  Dashboard
                </Link>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded border border-neutral-200 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
