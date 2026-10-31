import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TimezoneSelector } from '../components/TimezoneSelector';
import toast from 'react-hot-toast';
import {
  Calendar,
  Clock,
  Settings,
  User,
  ShieldAlert,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Lock,
  Stethoscope,
  Filter,
} from 'lucide-react';
import { DateTime } from 'luxon';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const normalizeWorkingHours = (hours = []) => {
  return DAYS_OF_WEEK.map((dayName) => {
    const existing = (hours || []).find(
      (w) => w && w.day && w.day.toLowerCase() === dayName.toLowerCase()
    );
    if (existing) {
      return {
        day: dayName,
        enabled: Boolean(existing.enabled),
        intervals: Array.isArray(existing.intervals)
          ? existing.intervals.map((int) => ({
              start: int.start || '09:00',
              end: int.end || '12:00',
            }))
          : [],
      };
    }
    const isWeekday = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(dayName);
    return {
      day: dayName,
      enabled: isWeekday,
      intervals: isWeekday
        ? [
            { start: '09:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ]
        : [],
    };
  });
};

export const DoctorDashboard = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('appointments'); // appointments, schedule, settings, blocked, profile
  const [loading, setLoading] = useState(true);

  // Doctor Profile state
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState(0);
  const [consultationFee, setConsultationFee] = useState(0);
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('Europe/London');

  // Schedule & Buffer state
  const [workingHours, setWorkingHours] = useState(() => normalizeWorkingHours([]));
  const [appointmentDuration, setAppointmentDuration] = useState(30);
  const [bufferEnabled, setBufferEnabled] = useState(true);
  const [bufferDuration, setBufferDuration] = useState(15);

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [selectedAppointmentAudit, setSelectedAppointmentAudit] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Blocked slots state
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockingLoading, setBlockingLoading] = useState(false);

  // Fetch full doctor profile, settings and appointments
  const loadDoctorData = async () => {
    try {
      setLoading(true);
      const doctorId = user?.id || user?._id;
      if (!doctorId) return;

      const [profileRes, appRes, blockedRes] = await Promise.allSettled([
        api.get(`/doctors/${doctorId}`),
        api.get('/appointments/doctor'),
        api.get('/doctors/blocked-slots'),
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data.success) {
        const d = profileRes.value.data.data;
        setProfile(d);
        setName(d.name || '');
        setSpecialization(d.specialization || '');
        setExperience(d.experience || 0);
        setConsultationFee(d.consultationFee || 0);
        setBio(d.bio || '');
        setTimezone(d.timezone || 'Europe/London');
        setWorkingHours(normalizeWorkingHours(d.workingHours));
        setAppointmentDuration(d.appointmentDuration || 30);
        setBufferEnabled(d.bufferTime?.enabled ?? true);
        setBufferDuration(d.bufferTime?.duration ?? 15);
      }

      if (appRes.status === 'fulfilled' && appRes.value.data.success) {
        setAppointments(appRes.value.data.data || []);
      }

      if (blockedRes.status === 'fulfilled' && blockedRes.value.data.success) {
        setBlockedSlots(blockedRes.value.data.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load doctor console data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
  }, [user?.id, user?._id]);

  // Handle working hours interval modification
  const handleToggleDay = (dayName) => {
    setWorkingHours((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const willBeEnabled = !d.enabled;
        const intervals =
          willBeEnabled && (!d.intervals || d.intervals.length === 0)
            ? [
                { start: '09:00', end: '12:00' },
                { start: '13:00', end: '17:00' },
              ]
            : d.intervals || [];
        return {
          ...d,
          enabled: willBeEnabled,
          intervals,
        };
      })
    );
  };

  const handleAddInterval = (dayName) => {
    setWorkingHours((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const currentIntervals = Array.isArray(d.intervals) ? d.intervals : [];
        return {
          ...d,
          enabled: true,
          intervals: [...currentIntervals, { start: '09:00', end: '12:00' }],
        };
      })
    );
  };

  const handleRemoveInterval = (dayName, intervalIndex) => {
    setWorkingHours((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const newIntervals = [...(d.intervals || [])];
        newIntervals.splice(intervalIndex, 1);
        return {
          ...d,
          intervals: newIntervals,
        };
      })
    );
  };

  const handleIntervalChange = (dayName, intervalIndex, field, value) => {
    setWorkingHours((prev) =>
      prev.map((d) => {
        if (d.day !== dayName) return d;
        const newIntervals = (d.intervals || []).map((int, idx) => {
          if (idx !== intervalIndex) return int;
          return { ...int, [field]: value };
        });
        return {
          ...d,
          intervals: newIntervals,
        };
      })
    );
  };

  const handleResetToStandardShifts = () => {
    setWorkingHours(normalizeWorkingHours([]));
    toast.success('Reset working hours to standard Monday-Friday shifts');
  };

  // Save Working Schedule
  const saveSchedule = async () => {
    // Validate intervals for enabled days
    for (const day of workingHours) {
      if (day.enabled && Array.isArray(day.intervals)) {
        for (let i = 0; i < day.intervals.length; i++) {
          const int = day.intervals[i];
          if (!int.start || !int.end) {
            toast.error(`${day.day}: Each interval must have both start and end time specified`);
            return;
          }
          if (int.start >= int.end) {
            toast.error(
              `${day.day}: Interval start time (${int.start}) must be before end time (${int.end})`
            );
            return;
          }
        }
      }
    }

    try {
      const { data } = await api.put('/doctors/schedule', { workingHours });
      if (data.success) {
        toast.success('Clinical working hours updated');
      }
    } catch (err) {
      toast.error(err.message || 'Could not save schedule');
    }
  };

  // Save Appointment Duration & Buffer Rules
  const saveAppointmentSettings = async () => {
    try {
      const { data } = await api.put('/doctors/appointment-settings', {
        appointmentDuration: Number(appointmentDuration),
        bufferTime: {
          enabled: bufferEnabled,
          duration: Number(bufferDuration),
        },
      });
      if (data.success) {
        toast.success('Consultation duration and automatic buffer saved');
      }
    } catch (err) {
      toast.error(err.message || 'Could not update settings');
    }
  };

  // Save Profile
  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/doctors/profile', {
        name,
        specialization,
        experience: Number(experience),
        consultationFee: Number(consultationFee),
        bio,
        timezone,
      });
      if (data.success) {
        toast.success('Profile details updated');
        setUser({ ...user, name, timezone });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  // Create Blocked Period
  const handleCreateBlock = async (e) => {
    e.preventDefault();
    if (!blockStart || !blockEnd || !blockReason) {
      toast.error('Please specify start, end, and reason');
      return;
    }

    setBlockingLoading(true);
    try {
      const { data } = await api.post('/doctors/blocked-slots', {
        startAt: new Date(blockStart).toISOString(),
        endAt: new Date(blockEnd).toISOString(),
        reason: blockReason,
      });

      if (data.success) {
        toast.success('Time interval successfully blocked');
        setBlockStart('');
        setBlockEnd('');
        setBlockReason('');
        const res = await api.get('/doctors/blocked-slots');
        setBlockedSlots(res.data.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to block time');
    } finally {
      setBlockingLoading(false);
    }
  };

  // Delete Blocked Period
  const handleDeleteBlock = async (id) => {
    try {
      const { data } = await api.delete(`/doctors/blocked-slots/${id}`);
      if (data.success) {
        toast.success('Blocked period removed. Availability restored.');
        setBlockedSlots(blockedSlots.filter((b) => b._id !== id));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete block');
    }
  };

  // View Audit Log
  const viewAuditHistory = async (appointmentId) => {
    try {
      const { data } = await api.get(`/appointments/${appointmentId}/history`);
      if (data.success) {
        setAuditLogs(data.data);
        setSelectedAppointmentAudit(appointmentId);
      }
    } catch (err) {
      toast.error('Failed to load audit history');
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((app) => {
    if (selectedStatus !== 'ALL' && app.status !== selectedStatus) {
      return false;
    }
    if (selectedDateFilter) {
      const appDateStr = new Date(app.startAt).toISOString().split('T')[0];
      if (appDateStr !== selectedDateFilter) {
        return false;
      }
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = appointments.filter(
    (a) => a.status === 'CONFIRMED' && new Date(a.startAt).toISOString().split('T')[0] === todayStr
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-xs font-mono text-neutral-600">
          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Doctor Schedule & Clinical Settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Clinical Summary */}
        <div className="bg-white border border-neutral-200 rounded-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                  ATTENDING PHYSICIAN CONSOLE
                </span>
                <span className="text-xs font-mono text-neutral-400">•</span>
                <span className="text-xs font-mono text-neutral-600">
                  Timezone: {timezone}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1.5">
                {name || 'Doctor Console'}
              </h1>
              <p className="text-xs text-neutral-600 mt-0.5">
                {specialization} • {experience} years experience • Consultation fee: ${consultationFee}
              </p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="flex items-center gap-3">
              <div className="bg-neutral-50 border border-neutral-200 px-3.5 py-2 rounded text-center">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Today's Visits
                </span>
                <span className="text-lg font-bold text-neutral-900 font-mono">
                  {todayCount}
                </span>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 px-3.5 py-2 rounded text-center">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Total Bookings
                </span>
                <span className="text-lg font-bold text-neutral-900 font-mono">
                  {appointments.length}
                </span>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 px-3.5 py-2 rounded text-center">
                <span className="text-[10px] font-mono text-neutral-500 uppercase block">
                  Buffer Setting
                </span>
                <span className="text-sm font-semibold text-emerald-700 font-mono mt-0.5 block">
                  {bufferEnabled ? `+${bufferDuration}m` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-neutral-200 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'appointments'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Appointments ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'schedule'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Working Hours
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'settings'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Consultation & Buffer Rules
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'blocked'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Blocked Intervals ({blockedSlots.length})
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === 'profile'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Profile & Timezone
            </button>
          </div>
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white border border-neutral-200 rounded-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h2 className="text-base font-bold text-neutral-900">
                Scheduled Consultations
              </h2>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Date Filter */}
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                />

                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter('')}
                    className="text-xs text-neutral-500 hover:text-neutral-800 px-1 font-mono"
                  >
                    Clear Date
                  </button>
                )}

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 font-mono bg-neutral-50 rounded border border-neutral-200">
                No appointments match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 text-neutral-500 font-mono uppercase text-[10px]">
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Doctor Local Time ({timezone})</th>
                      <th className="py-2.5 px-3">Patient Local Time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-right">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80">
                    {filteredAppointments.map((app) => {
                      const docDt = DateTime.fromISO(new Date(app.startAt).toISOString(), {
                        zone: timezone,
                      });
                      const docEndDt = DateTime.fromISO(new Date(app.endAt).toISOString(), {
                        zone: timezone,
                      });
                      const patDt = DateTime.fromISO(new Date(app.startAt).toISOString(), {
                        zone: app.patientTimezone,
                      });
                      const patEndDt = DateTime.fromISO(new Date(app.endAt).toISOString(), {
                        zone: app.patientTimezone,
                      });

                      return (
                        <tr key={app._id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-3 font-medium text-neutral-900">
                            <div>{app.patientId?.name || 'Patient'}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {app.patientId?.email}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-neutral-800">
                            <div>{docDt.toFormat('yyyy-MM-dd')}</div>
                            <div className="font-semibold text-neutral-900">
                              {docDt.toFormat('HH:mm')} - {docEndDt.toFormat('HH:mm')} ({docDt.offsetNameShort})
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-neutral-600">
                            <div>{patDt.toFormat('yyyy-MM-dd')}</div>
                            <div>
                              {patDt.toFormat('HH:mm')} - {patEndDt.toFormat('HH:mm')} ({patDt.offsetNameShort})
                            </div>
                            <div className="text-[10px] text-neutral-400">{app.patientTimezone}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                app.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-neutral-700 max-w-xs truncate">
                            {app.reason || 'General Consultation'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => viewAuditHistory(app._id)}
                              className="px-2 py-1 text-[11px] font-mono text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-100"
                            >
                              Audit Trail
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Audit Log Drawer if selected */}
            {selectedAppointmentAudit && (
              <div className="mt-6 p-4 bg-neutral-900 text-neutral-100 rounded border border-neutral-800">
                <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
                  <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                    Appointment Audit Trail (ID: {selectedAppointmentAudit})
                  </span>
                  <button
                    onClick={() => setSelectedAppointmentAudit(null)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-400 font-mono">No audit events recorded.</p>
                ) : (
                  <div className="space-y-2 text-xs font-mono">
                    {auditLogs.map((log) => (
                      <div
                        key={log._id}
                        className="p-2 bg-neutral-800 rounded border border-neutral-700/60 flex items-start justify-between"
                      >
                        <div>
                          <span className="text-emerald-400 font-semibold">{log.action}</span>
                          <span className="text-neutral-400 ml-2">by {log.performedBy?.name}</span>
                          <p className="text-[11px] text-neutral-300 mt-0.5">{log.details}</p>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(log.performedAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: WORKING HOURS */}
        {activeTab === 'schedule' && (
          <div className="bg-white border border-neutral-200 rounded-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  Weekly Working Shift Configuration
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Set daily availability intervals in your home timezone ({timezone}). Multiple intervals per day supported.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToStandardShifts}
                  className="px-3 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors font-mono"
                >
                  Reset Standard Weekdays
                </button>
                <button
                  onClick={saveSchedule}
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {workingHours.map((daySchedule) => {
                const dayName = daySchedule.day;

                return (
                  <div
                    key={dayName}
                    className={`p-4 border rounded-md transition-colors ${
                      daySchedule.enabled
                        ? 'border-neutral-200 bg-white'
                        : 'border-neutral-200/60 bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <label className="flex items-center space-x-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={daySchedule.enabled}
                          onChange={() => handleToggleDay(dayName)}
                          className="w-4 h-4 text-emerald-600 rounded border-neutral-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            daySchedule.enabled ? 'text-neutral-900' : 'text-neutral-400'
                          }`}
                        >
                          {dayName}
                        </span>
                        {!daySchedule.enabled && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            (Closed / Day Off)
                          </span>
                        )}
                      </label>

                      {daySchedule.enabled && (
                        <button
                          type="button"
                          onClick={() => handleAddInterval(dayName)}
                          className="inline-flex items-center space-x-1 text-xs text-emerald-700 hover:text-emerald-800 font-mono bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded border border-emerald-200/60 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Shift Interval</span>
                        </button>
                      )}
                    </div>

                    {daySchedule.enabled && (
                      <div className="space-y-2.5 pl-7">
                        {!daySchedule.intervals || daySchedule.intervals.length === 0 ? (
                          <div className="text-xs text-neutral-400 font-mono bg-neutral-50 p-2.5 rounded border border-dashed border-neutral-200">
                            No active shift intervals. Click '+ Add Shift Interval' to define consulting hours.
                          </div>
                        ) : (
                          daySchedule.intervals.map((interval, intIdx) => (
                            <div key={intIdx} className="flex items-center space-x-2.5 flex-wrap">
                              <div className="flex items-center space-x-1.5 bg-neutral-50 p-1.5 rounded border border-neutral-200">
                                <span className="text-[11px] font-mono text-neutral-500 uppercase px-1">
                                  Start
                                </span>
                                <input
                                  type="time"
                                  value={interval.start}
                                  onChange={(e) =>
                                    handleIntervalChange(dayName, intIdx, 'start', e.target.value)
                                  }
                                  className="px-2 py-1 text-xs border border-neutral-300 rounded font-mono text-neutral-800 bg-white"
                                />
                                <span className="text-xs text-neutral-400 font-mono px-1">to</span>
                                <span className="text-[11px] font-mono text-neutral-500 uppercase px-1">
                                  End
                                </span>
                                <input
                                  type="time"
                                  value={interval.end}
                                  onChange={(e) =>
                                    handleIntervalChange(dayName, intIdx, 'end', e.target.value)
                                  }
                                  className="px-2 py-1 text-xs border border-neutral-300 rounded font-mono text-neutral-800 bg-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveInterval(dayName, intIdx)}
                                className="p-1.5 text-neutral-400 hover:text-red-700 hover:bg-red-50 border border-neutral-200 hover:border-red-200 rounded transition-colors"
                                title="Delete shift interval"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-neutral-200 pt-4">
              <button
                type="button"
                onClick={handleResetToStandardShifts}
                className="px-3 py-2 text-xs text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors font-mono"
              >
                Reset Standard Weekdays
              </button>
              <button
                onClick={saveSchedule}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors shadow-sm"
              >
                Save Schedule
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: CONSULTATION & BUFFER SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white border border-neutral-200 rounded-md p-6 max-w-2xl">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              Consultation Duration & Automatic Break Rules
            </h2>
            <p className="text-xs text-neutral-600 mb-6">
              Configure baseline consultation durations and compulsory safety buffers enforced by the backend availability engine.
            </p>

            <div className="space-y-6">
              {/* Consultation duration */}
              <div>
                <label className="block text-xs font-mono text-neutral-700 uppercase mb-2 font-semibold">
                  Appointment Duration (Minutes)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[15, 30, 60].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setAppointmentDuration(dur)}
                      className={`py-2.5 text-xs font-mono rounded border transition-colors ${
                        appointmentDuration === dur
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {dur} Minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic Break / Buffer */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-xs font-mono text-neutral-800 uppercase font-semibold">
                      Automatic Break Time After Each Appointment
                    </label>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Enforces non-bookable resting/sanitization buffer immediately following every consultation.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={bufferEnabled}
                    onChange={(e) => setBufferEnabled(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-neutral-300"
                  />
                </div>

                {bufferEnabled && (
                  <div className="mt-4">
                    <label className="block text-[11px] font-mono text-neutral-600 uppercase mb-2">
                      Break Duration (Minutes):
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[0, 5, 10, 15, 20, 30].map((bDur) => (
                        <button
                          key={bDur}
                          type="button"
                          onClick={() => setBufferDuration(bDur)}
                          className={`py-2 text-xs font-mono rounded border transition-colors ${
                            bufferDuration === bDur
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          {bDur}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={saveAppointmentSettings}
                  className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BLOCKED PERIODS */}
        {activeTab === 'blocked' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Blocked Period Form */}
            <div className="bg-white border border-neutral-200 rounded-md p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-1">
                Block Clinical Time Period
              </h2>
              <p className="text-xs text-neutral-600 mb-4">
                Mark specific hours unavailable for lunch, ward rounds, personal breaks or holidays.
              </p>

              <form onSubmit={handleCreateBlock} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Start Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockStart}
                    onChange={(e) => setBlockStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    End Timestamp
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={blockEnd}
                    onChange={(e) => setBlockEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hospital Grand Rounds, Staff Meeting"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded text-neutral-800"
                  />
                </div>

                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600">
                  <span className="font-semibold block text-neutral-800 mb-0.5">Constraint Guardrail:</span>
                  The system will automatically prevent you from blocking a period that contains existing confirmed appointments without first resolving those bookings.
                </div>

                <button
                  type="submit"
                  disabled={blockingLoading}
                  className="w-full py-2 px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                >
                  {blockingLoading ? 'Validating Conflicts...' : 'Block Period'}
                </button>
              </form>
            </div>

            {/* Existing Blocked Slots List */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-md p-6">
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                Active Blocked Periods ({blockedSlots.length})
              </h2>

              {blockedSlots.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500 font-mono bg-neutral-50 rounded border border-neutral-200">
                  No active blocked periods recorded.
                </div>
              ) : (
                <div className="space-y-3">
                  {blockedSlots.map((block) => {
                    const startDt = DateTime.fromISO(new Date(block.startAt).toISOString(), {
                      zone: timezone,
                    });
                    const endDt = DateTime.fromISO(new Date(block.endAt).toISOString(), {
                      zone: timezone,
                    });

                    return (
                      <div
                        key={block._id}
                        className="p-3.5 bg-neutral-50 rounded border border-neutral-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-neutral-900 text-xs">
                            {block.reason}
                          </div>
                          <div className="text-[11px] font-mono text-neutral-600 mt-0.5">
                            {startDt.toFormat('yyyy-MM-dd HH:mm')} - {endDt.toFormat('HH:mm')} ({startDt.offsetNameShort})
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteBlock(block._id)}
                          className="px-2 py-1 text-xs text-red-700 hover:bg-red-50 border border-red-200 rounded transition-colors"
                        >
                          Remove Block
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE & TIMEZONE */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-neutral-200 rounded-md p-6 max-w-2xl">
            <h2 className="text-base font-bold text-neutral-900 mb-1">
              Physician Credentials & Clinical Profile
            </h2>
            <p className="text-xs text-neutral-600 mb-6">
              Manage your display name, clinical specialization, fees and operating timezone.
            </p>

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded font-sans text-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    required
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded text-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                    Consultation Fee ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded font-mono text-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                  Years of Clinical Experience
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded font-mono text-neutral-900"
                />
              </div>

              <div>
                <TimezoneSelector
                  value={timezone}
                  onChange={setTimezone}
                  label="Doctor Operational Timezone"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-700 uppercase mb-1">
                  Clinical Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded text-neutral-900"
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded transition-colors"
              >
                Update Profile
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
