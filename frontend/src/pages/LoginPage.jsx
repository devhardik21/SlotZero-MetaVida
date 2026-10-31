import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Stethoscope, User } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      if (from) {
        navigate(from, { replace: true });
      } else if (res.user.role === 'DOCTOR') {
        navigate('/doctor', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    }
  };

  const handleQuickFill = async (demoEmail) => {
    setEmail(demoEmail);
    setPassword('demoPassword123!');
    setLoading(true);
    const res = await quickDemoLogin(demoEmail);
    setLoading(false);

    if (res.success) {
      if (res.user.role === 'DOCTOR') {
        navigate('/doctor', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-neutral-900 flex items-center justify-center text-white font-mono font-bold text-sm">
            SZ
          </div>
          <span className="font-semibold text-neutral-900 text-lg">SlotZero</span>
        </Link>
        <h2 className="mt-3 text-xl font-bold text-neutral-900 tracking-tight">
          Clinical Authentication Portal
        </h2>
        <p className="mt-1 text-xs text-neutral-500 font-mono">
          Access your doctor scheduling console or patient appointments
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-6 px-6 border border-neutral-200 rounded-md">
          {/* 1-Click Evaluation Presets */}
          <div className="mb-6 p-3 bg-neutral-50 border border-neutral-200 rounded">
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider block mb-2 font-semibold">
              Instant Demo Logins (Click to Authenticate):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('meera@slotzero.io')}
                className="flex items-center space-x-1.5 p-2 bg-white border border-neutral-200 hover:border-emerald-600 hover:bg-emerald-50 rounded text-left transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-neutral-800 text-[11px] truncate">Dr. Meera</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Doctor • London</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('alex@slotzero.io')}
                className="flex items-center space-x-1.5 p-2 bg-white border border-neutral-200 hover:border-emerald-600 hover:bg-emerald-50 rounded text-left transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-neutral-800 text-[11px] truncate">Dr. Alex</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Doctor • New York</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('asha@slotzero.io')}
                className="flex items-center space-x-1.5 p-2 bg-white border border-neutral-200 hover:border-emerald-600 hover:bg-emerald-50 rounded text-left transition-colors"
              >
                <User className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-neutral-800 text-[11px] truncate">Asha Sharma</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Patient • Kolkata</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('sam@slotzero.io')}
                className="flex items-center space-x-1.5 p-2 bg-white border border-neutral-200 hover:border-emerald-600 hover:bg-emerald-50 rounded text-left transition-colors"
              >
                <User className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0" />
                <div className="truncate">
                  <div className="font-medium text-neutral-800 text-[11px] truncate">Sam Miller</div>
                  <div className="text-[10px] text-neutral-500 font-mono">Patient • New York</div>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@slotzero.io"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-neutral-200 text-center text-xs text-neutral-500">
            Need an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-700 hover:underline">
              Register as Doctor or Patient
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
