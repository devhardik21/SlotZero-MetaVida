import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TimezoneSelector, SUPPORTED_TIMEZONES } from '../components/TimezoneSelector';
import { User, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';

export const RegisterPage = () => {
  const [role, setRole] = useState('PATIENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');

  // Doctor specific fields
  const [specialization, setSpecialization] = useState('General Physician');
  const [experience, setExperience] = useState(5);
  const [consultationFee, setConsultationFee] = useState(100);
  const [bio, setBio] = useState('Board-certified medical practitioner committed to clinical excellence.');

  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      email,
      password,
      role,
      timezone,
    };

    if (role === 'DOCTOR') {
      payload.specialization = specialization;
      payload.experience = Number(experience);
      payload.consultationFee = Number(consultationFee);
      payload.bio = bio;
    }

    const res = await register(payload);
    setLoading(false);

    if (res.success) {
      if (role === 'DOCTOR') {
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
          Create Clinical Account
        </h2>
        <p className="mt-1 text-xs text-neutral-500 font-mono">
          Register as an attending physician or patient
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-6 px-6 border border-neutral-200 rounded-md">
          {/* Role selector tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-neutral-100 rounded border border-neutral-200">
            <button
              type="button"
              onClick={() => setRole('PATIENT')}
              className={`flex items-center justify-center space-x-2 py-2 text-xs font-semibold rounded transition-colors ${
                role === 'PATIENT'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <User className="w-3.5 h-3.5 text-neutral-600" />
              <span>Patient Account</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('DOCTOR')}
              className={`flex items-center justify-center space-x-2 py-2 text-xs font-semibold rounded transition-colors ${
                role === 'DOCTOR'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
              <span>Doctor Console</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={role === 'DOCTOR' ? 'Dr. Elizabeth Reed' : 'Jonathan Miller'}
                className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-sans text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reed@slotzero.io"
                className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
              />
            </div>

            {/* Timezone */}
            <div>
              <TimezoneSelector
                value={timezone}
                onChange={setTimezone}
                label="Home Clinical Timezone"
              />
            </div>

            {/* Doctor specific fields */}
            {role === 'DOCTOR' && (
              <div className="pt-3 border-t border-neutral-200 space-y-3">
                <span className="text-[11px] font-mono text-emerald-800 uppercase tracking-wider font-semibold block">
                  Clinical Profile Information
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                      Specialization
                    </label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 text-neutral-900 font-sans"
                    >
                      <option value="General Physician">General Physician</option>
                      <option value="Cardiologist">Cardiologist</option>
                      <option value="Neurologist">Neurologist</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Dermatologist">Dermatologist</option>
                      <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                      Consultation Fee ($)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={consultationFee}
                      onChange={(e) => setConsultationFee(e.target.value)}
                      className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Years of Clinical Experience
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 font-mono text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Professional Biography
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 text-neutral-900"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registering Profile...</span>
                </>
              ) : (
                <>
                  <span>Create Account & Start</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-neutral-200 text-center text-xs text-neutral-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
