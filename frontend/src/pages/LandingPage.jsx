import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QuickDemoSwitch } from '../components/QuickDemoSwitch';
import {
  ShieldCheck,
  Clock,
  Globe,
  Database,
  Calendar,
  Lock,
  ArrowRight,
  Stethoscope,
  Users,
  Activity,
  Layers,
} from 'lucide-react';

export const LandingPage = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Hero Section */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl">
            {/* Engine Status pill */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-mono mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>SLOTZERO V1.0 • MULTI-TIMEZONE CLINICAL SCHEDULING PLATFORM</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 tracking-tight leading-tight">
              Conflict-Free Doctor Scheduling Engine with Atomic Slot Locks
            </h1>

            <p className="mt-4 text-base sm:text-lg text-neutral-600 leading-relaxed">
              Engineered for multi-timezone clinical operations across London, New York, and Kolkata.
              Eliminates double bookings through MongoDB transaction-level 15-minute slot locks, dynamic
              buffer generation, and IANA timezone-aware scheduling.
            </p>

            {/* Quick action buttons */}
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <Link
                to="/patient"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <span>Launch Patient Portal</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>

              <Link
                to="/doctor"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-800 border border-neutral-300 rounded text-sm font-medium hover:bg-neutral-100 transition-colors"
              >
                <Stethoscope className="w-4 h-4 text-emerald-700" />
                <span>Doctor Scheduling Console</span>
              </Link>
            </div>
          </div>

          {/* Quick Evaluator Switcher */}
          <div className="mt-10">
            <QuickDemoSwitch />
          </div>
        </div>
      </section>

      {/* Core Architectural Pillars */}
      <section className="py-12 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="text-xs font-mono text-emerald-800 uppercase tracking-wider font-semibold">
              CORE SYSTEM ARCHITECTURE
            </span>
            <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1">
              Deterministic, Zero-Collision Clinical Operations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="bg-white border border-neutral-200 p-6 rounded-md">
              <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                15-Min Quantized Slot Locks
              </h3>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                Guarantees zero overlapping bookings via atomic MongoDB replica-set transactions.
                Appointments lock compound index <code className="font-mono text-emerald-800 bg-neutral-100 px-1 py-0.5 rounded text-[11px]">&#123; doctorId, startAt &#125;</code> slices,
                instantly rejecting concurrent collisions with HTTP 409.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white border border-neutral-200 p-6 rounded-md">
              <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Automatic Clinical Buffers
              </h3>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                Doctor-configured safety breaks (5, 10, 15, 20, 30m) are calculated dynamically on the backend.
                Buffers never spill outside working intervals, never create fake appointment rows, and release automatically on cancellation.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white border border-neutral-200 p-6 rounded-md">
              <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900">
                Strict Multi-Timezone UTC Engine
              </h3>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                Zero offset hardcoding. Powered by Luxon across Asia/Kolkata, Europe/London, and America/New_York.
                Handles daylight saving shifts (GMT/BST, EST/EDT) and rejects nonexistent local time anomalies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live System Capabilities Table / Schedule Demonstration */}
      <section className="py-12 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-mono text-emerald-800 uppercase tracking-wider font-semibold">
                SEEDED MEDICAL PROFILES
              </span>
              <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1">
                Verified Clinical Test Accounts
              </h2>
            </div>
            <p className="text-xs text-neutral-500 font-mono mt-2 md:mt-0">
              Passcode for all seeded accounts: <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">demoPassword123!</code>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dr. Meera Card */}
            <div className="border border-neutral-200 rounded-md p-5 bg-neutral-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block text-[11px] font-mono uppercase text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-medium">
                    Doctor • Europe/London
                  </span>
                  <h3 className="text-lg font-bold text-neutral-900 mt-2">Dr. Meera Patel</h3>
                  <p className="text-xs text-neutral-600">General Physician • 12 Yrs Clinical Experience</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-neutral-500 block">Fee: $90</span>
                  <span className="text-[11px] font-mono text-emerald-700 block mt-0.5">30m + 15m Buffer</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 text-xs text-neutral-700 grid grid-cols-2 gap-2 font-mono">
                <div>Working Shift: Mon-Fri 09:00-12:00, 13:00-17:00</div>
                <div>London Local Time: GMT/BST</div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    useAuth.getState?.() || null;
                    navigate('/login');
                  }}
                  className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded hover:bg-neutral-800 transition-colors font-medium"
                >
                  Inspect Schedule in Console
                </button>
              </div>
            </div>

            {/* Dr. Alex Card */}
            <div className="border border-neutral-200 rounded-md p-5 bg-neutral-50/50">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block text-[11px] font-mono uppercase text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded font-medium">
                    Doctor • America/New_York
                  </span>
                  <h3 className="text-lg font-bold text-neutral-900 mt-2">Dr. Alex Vance</h3>
                  <p className="text-xs text-neutral-600">Cardiologist • 16 Yrs Interventional Cardiology</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-neutral-500 block">Fee: $175</span>
                  <span className="text-[11px] font-mono text-emerald-700 block mt-0.5">30m + 10m Buffer</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 text-xs text-neutral-700 grid grid-cols-2 gap-2 font-mono">
                <div>Working Shift: Mon-Fri 09:00-12:00, 13:00-17:00</div>
                <div>New York Local Time: EST/EDT</div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-3 py-1.5 bg-neutral-900 text-white text-xs rounded hover:bg-neutral-800 transition-colors font-medium"
                >
                  Inspect Schedule in Console
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 font-mono">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-neutral-800">SlotZero</span>
            <span>•</span>
            <span>Healthcare SaaS Scheduling Engine</span>
          </div>
          <div className="mt-2 sm:mt-0">
            MongoDB Atlas Replica Set • Luxon Multi-TZ • React 19 + Tailwind
          </div>
        </div>
      </footer>
    </div>
  );
};
