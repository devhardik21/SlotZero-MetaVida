import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { TimezoneSelector, SUPPORTED_TIMEZONES } from '../components/TimezoneSelector';
import { InlineSlotPicker } from '../components/InlineSlotPicker';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
  XCircle,
  RefreshCw,
  History,
  CheckCircle,
  FileText,
  Stethoscope,
  ChevronDown,
} from 'lucide-react';
import { DateTime } from 'luxon';

export const PatientDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'my-appointments'

  // Filter Drawer State (Left 35% Asymmetrical Layout)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to upcoming working weekday (Monday-Friday)
    const d = new Date();
    // If today is Saturday or Sunday, skip forward to Monday
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    return d.toISOString().split('T')[0];
  });
  const [viewingTimezone, setViewingTimezone] = useState(
    user?.timezone || 'Asia/Kolkata'
  );

  // Doctors List & State (Right 65% Asymmetrical Layout)
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // My Appointments State
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentFilter, setAppointmentFilter] = useState('ALL');
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState(null);
  const [rescheduleDoctorSlots, setRescheduleDoctorSlots] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState(null);

  // Audit Log Modal/Drawer
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedAuditAppId, setSelectedAuditAppId] = useState(null);

  // Specialization list
  const specializations = [
    'All',
    'General Physician',
    'Cardiologist',
    'Neurologist',
    'Pediatrics',
    'Dermatologist',
    'Orthopedic Surgeon',
  ];

  // Fetch Doctors List
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      let url = '/doctors';
      const params = [];
      if (searchQuery) params.push(`search=${encodeURIComponent(searchQuery)}`);
      if (selectedSpecialization && selectedSpecialization !== 'All') {
        params.push(`specialization=${encodeURIComponent(selectedSpecialization)}`);
      }
      if (params.length > 0) url += `?${params.join('&')}`;

      const { data } = await api.get(url);
      if (data.success) {
        setDoctors(data.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Could not fetch doctors');
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Fetch My Appointments
  const fetchMyAppointments = async () => {
    setLoadingAppointments(true);
    try {
      const { data } = await api.get('/appointments/my');
      if (data.success) {
        setMyAppointments(data.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Could not fetch your appointments');
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchQuery, selectedSpecialization]);

  useEffect(() => {
    if (activeTab === 'my-appointments') {
      fetchMyAppointments();
    }
  }, [activeTab]);

  // Cancel Appointment handler
  const handleCancelAppointment = async (appointmentId) => {
    const reason = prompt('Please specify cancellation reason:');
    if (reason === null) return; // user cancelled prompt

    try {
      const { data } = await api.patch(`/appointments/${appointmentId}/cancel`, {
        reason: reason.trim() || 'Patient personal schedule conflict',
      });
      if (data.success) {
        toast.success('Appointment cancelled and slot lock released');
        fetchMyAppointments();
      }
    } catch (err) {
      toast.error(err.message || 'Cancellation rejected');
    }
  };

  // Open Reschedule Flow
  const handleStartReschedule = async (app) => {
    setReschedulingAppointmentId(app._id);
    setSelectedRescheduleSlot(null);
    setRescheduleLoading(true);

    try {
      const docId = app.doctorId?._id || app.doctorId;
      const { data } = await api.get(
        `/doctors/${docId}/availability?date=${selectedDate}&timezone=${viewingTimezone}`
      );
      if (data.success) {
        setRescheduleDoctorSlots(data.data.slots || []);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch doctor availability for rescheduling');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Submit Reschedule
  const handleConfirmReschedule = async (appId) => {
    if (!selectedRescheduleSlot) {
      toast.error('Please pick a new available time slot');
      return;
    }

    try {
      const { data } = await api.patch(`/appointments/${appId}/reschedule`, {
        newStartAt: selectedRescheduleSlot.startAt,
        newEndAt: selectedRescheduleSlot.endAt,
        reason: 'Rescheduled by patient to new slot',
      });

      if (data.success) {
        toast.success('Appointment successfully rescheduled with new atomic slot lock!');
        setReschedulingAppointmentId(null);
        setSelectedRescheduleSlot(null);
        fetchMyAppointments();
      }
    } catch (err) {
      toast.error(err.message || 'Reschedule rejected');
    }
  };

  // View Audit Trail
  const handleViewAudit = async (appId) => {
    try {
      const { data } = await api.get(`/appointments/${appId}/history`);
      if (data.success) {
        setAuditLogs(data.data || []);
        setSelectedAuditAppId(appId);
      }
    } catch (err) {
      toast.error('Failed to load audit history');
    }
  };

  // Filtered Appointments
  const filteredAppointments = myAppointments.filter((app) => {
    if (appointmentFilter === 'ALL') return true;
    return app.status === appointmentFilter;
  });

  return (
    <div className="min-h-screen bg-neutral-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header / Portal Navigation */}
        <div className="bg-white border border-neutral-200 rounded-md p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                  PATIENT ACCESS PORTAL
                </span>
                <span className="text-xs font-mono text-neutral-400">•</span>
                <span className="text-xs font-mono text-neutral-600">
                  Logged in as {user?.name}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-1.5">
                Clinical Discovery & Scheduling
              </h1>
              <p className="text-xs text-neutral-600 mt-0.5">
                Book guaranteed conflict-free consultations with board-certified physicians worldwide.
              </p>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-2 text-xs font-medium rounded transition-colors ${
                  activeTab === 'browse'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Find & Book Doctors
              </button>
              <button
                onClick={() => setActiveTab('my-appointments')}
                className={`px-4 py-2 text-xs font-medium rounded transition-colors ${
                  activeTab === 'my-appointments'
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                My Bookings ({myAppointments.length})
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: BROWSE DOCTORS (MANDATORY HIGH-DENSITY SPLIT SCREEN ASYMMETRICAL LAYOUT) */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT SIDE (35% WIDTH): FIXED HIGH-DENSITY FILTERING DRAWER */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-neutral-200 rounded-md p-5 sticky top-20">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-mono font-semibold text-neutral-900 uppercase tracking-wider">
                      Clinical Filter Drawer
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Live Reactive
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Search by doctor name */}
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-700 uppercase mb-1">
                      Search Attending Physician
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
                        <Search className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g. Dr. Meera, Cardiology"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 text-neutral-900"
                      />
                    </div>
                  </div>

                  {/* Specialization Filter */}
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-700 uppercase mb-1">
                      Clinical Department
                    </label>
                    <select
                      value={selectedSpecialization}
                      onChange={(e) => setSelectedSpecialization(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded focus:outline-none focus:border-emerald-600 text-neutral-900 font-sans"
                    >
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Live Date Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono text-neutral-700 uppercase flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-700" />
                        Appointment Date
                      </label>
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {DateTime.fromISO(selectedDate).toFormat('cccc')}
                      </span>
                    </div>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-2.5 py-1.5 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                    />

                    {/* Quick Weekday Chips */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono text-neutral-400">Weekdays:</span>
                      {[
                        { label: 'Mon Nov 2', date: '2026-11-02' },
                        { label: 'Tue Nov 3', date: '2026-11-03' },
                        { label: 'Wed Nov 4', date: '2026-11-04' },
                      ].map((item) => (
                        <button
                          key={item.date}
                          type="button"
                          onClick={() => setSelectedDate(item.date)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                            selectedDate === item.date
                              ? 'bg-neutral-900 text-white border-neutral-900 font-semibold'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Viewing Timezone Selector */}
                  <div>
                    <TimezoneSelector
                      value={viewingTimezone}
                      onChange={setViewingTimezone}
                      label="Viewer Local Timezone"
                    />
                    <span className="text-[10px] font-mono text-neutral-500 mt-1 block">
                      All slot times are converted dynamically to this timezone.
                    </span>
                  </div>

                  {/* System Architecture Metrics note */}
                  <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-[11px] text-neutral-600 font-mono space-y-1">
                    <div className="text-neutral-800 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Concurrency Guarantee
                    </div>
                    <div>• 15-min quantized locks</div>
                    <div>• Mongo transactions active</div>
                    <div>• Auto buffer enforcement</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE (65% WIDTH): SCROLLABLE CLINICAL PROFILE LISTS WITH ANTI-MODAL CALENDAR STRIP */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-600 font-mono mb-1">
                <span>
                  Showing {doctors.length} Board-Certified Physician{doctors.length === 1 ? '' : 's'}
                </span>
                <span>Date: {selectedDate}</span>
              </div>

              {loadingDoctors && (
                <div className="py-12 bg-white rounded border border-neutral-200 text-center text-xs font-mono text-neutral-500 flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <span>Scanning Clinical Schedules...</span>
                </div>
              )}

              {!loadingDoctors && doctors.length === 0 && (
                <div className="p-8 bg-white rounded border border-neutral-200 text-center">
                  <p className="text-xs font-medium text-neutral-700">
                    No doctors found matching the search criteria.
                  </p>
                  <p className="text-[11px] text-neutral-400 font-mono mt-1">
                    Try broadening your specialization filter or search term.
                  </p>
                </div>
              )}

              {!loadingDoctors &&
                doctors.map((doctor) => {
                  return (
                    <div
                      key={doctor.id}
                      className="bg-white border border-neutral-200 rounded-md p-5 transition-shadow hover:border-neutral-300"
                    >
                      {/* Doctor Clinical Profile Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-[10px] font-mono uppercase bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-semibold">
                              {doctor.specialization}
                            </span>
                            <span className="text-xs font-mono text-neutral-400">•</span>
                            <span className="text-xs font-mono text-emerald-800 font-medium">
                              Doctor TZ: {doctor.timezone}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-neutral-900 mt-1">
                            {doctor.name}
                          </h3>

                          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                            {doctor.bio || 'Board-certified medical practitioner.'}
                          </p>
                        </div>

                        {/* Metadata Tag Badges */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-1 flex-shrink-0 text-right">
                          <span className="text-sm font-bold text-neutral-900 font-mono">
                            ${doctor.consultationFee}
                            <span className="text-[10px] font-normal text-neutral-500"> / visit</span>
                          </span>
                          <span className="text-[11px] font-mono text-neutral-600">
                            {doctor.experience} Yrs Experience
                          </span>
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            {doctor.appointmentDuration}m + {doctor.bufferTime?.duration ?? 15}m buffer
                          </span>
                        </div>
                      </div>

                      {/* Working Schedule Summary */}
                      <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                        <div>
                          Shifts: Mon-Fri 09:00-12:00, 13:00-17:00 ({doctor.timezone.split('/')[1] || doctor.timezone})
                        </div>
                      </div>

                      {/* ANTI-MODAL INLINE CALENDAR STRIP */}
                      <InlineSlotPicker
                        doctor={doctor}
                        selectedDate={selectedDate}
                        viewingTimezone={viewingTimezone}
                        onBookingComplete={() => {
                          fetchMyAppointments();
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 2: MY APPOINTMENTS */}
        {activeTab === 'my-appointments' && (
          <div className="bg-white border border-neutral-200 rounded-md p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-neutral-900">
                  My Scheduled Consultations
                </h2>
                <p className="text-xs text-neutral-600 mt-0.5">
                  View upcoming bookings, cancel within deadline (up to 2 hours before start), or reschedule.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-neutral-500">Status:</span>
                <select
                  value={appointmentFilter}
                  onChange={(e) => setAppointmentFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-neutral-300 rounded font-mono text-neutral-800"
                >
                  <option value="ALL">All ({myAppointments.length})</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {loadingAppointments && (
              <div className="py-12 text-center text-xs font-mono text-neutral-500 flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading your appointments...</span>
              </div>
            )}

            {!loadingAppointments && filteredAppointments.length === 0 && (
              <div className="py-12 text-center text-xs font-mono text-neutral-500 bg-neutral-50 rounded border border-neutral-200">
                No appointments found. Browse available physicians to schedule your first visit!
              </div>
            )}

            {!loadingAppointments && filteredAppointments.length > 0 && (
              <div className="space-y-4">
                {filteredAppointments.map((app) => {
                  const now = new Date();
                  const appStart = new Date(app.startAt);
                  const twoHoursBefore = new Date(appStart.getTime() - 2 * 60 * 60 * 1000);
                  const isEligibleToCancel = app.status === 'CONFIRMED' && now < twoHoursBefore;
                  const isEligibleToReschedule = app.status === 'CONFIRMED';

                  const userTz = app.patientTimezone || user?.timezone || 'Asia/Kolkata';
                  const docTz = app.doctorTimezone || 'Europe/London';

                  const userDt = DateTime.fromISO(new Date(app.startAt).toISOString(), {
                    zone: userTz,
                  });
                  const userEndDt = DateTime.fromISO(new Date(app.endAt).toISOString(), {
                    zone: userTz,
                  });
                  const docDt = DateTime.fromISO(new Date(app.startAt).toISOString(), {
                    zone: docTz,
                  });
                  const docEndDt = DateTime.fromISO(new Date(app.endAt).toISOString(), {
                    zone: docTz,
                  });

                  return (
                    <div
                      key={app._id}
                      className="border border-neutral-200 rounded-md p-4 hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                app.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : app.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-neutral-100 text-neutral-700'
                              }`}
                            >
                              {app.status}
                            </span>
                            <span className="text-xs font-mono text-neutral-400">•</span>
                            <span className="text-xs font-medium text-neutral-900">
                              {app.doctorId?.name || 'Attending Physician'}
                            </span>
                          </div>

                          {/* Timezone breakdown */}
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-neutral-50 p-2 rounded border border-neutral-200/80">
                              <span className="text-[10px] text-neutral-500 uppercase block">
                                Your Time ({userTz})
                              </span>
                              <span className="font-semibold text-neutral-900">
                                {userDt.toFormat('yyyy-MM-dd HH:mm')} - {userEndDt.toFormat('HH:mm')} ({userDt.offsetNameShort})
                              </span>
                            </div>

                            <div className="bg-neutral-50 p-2 rounded border border-neutral-200/80">
                              <span className="text-[10px] text-neutral-500 uppercase block">
                                Doctor Time ({docTz})
                              </span>
                              <span className="font-semibold text-neutral-900">
                                {docDt.toFormat('yyyy-MM-dd HH:mm')} - {docEndDt.toFormat('HH:mm')} ({docDt.offsetNameShort})
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-neutral-600 mt-2">
                            <span className="font-medium text-neutral-800">Reason:</span> {app.reason}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-wrap md:flex-col md:items-end justify-end">
                          {isEligibleToReschedule && (
                            <button
                              onClick={() => handleStartReschedule(app)}
                              className="px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-300 rounded transition-colors"
                            >
                              Reschedule Slot
                            </button>
                          )}

                          {isEligibleToCancel && (
                            <button
                              onClick={() => handleCancelAppointment(app._id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded transition-colors"
                            >
                              Cancel Booking
                            </button>
                          )}

                          <button
                            onClick={() => handleViewAudit(app._id)}
                            className="px-2.5 py-1 text-[11px] font-mono text-neutral-600 hover:text-neutral-900 border border-neutral-200 rounded hover:bg-neutral-50"
                          >
                            Audit Trail
                          </button>
                        </div>
                      </div>

                      {/* Inline Rescheduling Slot Picker */}
                      {reschedulingAppointmentId === app._id && (
                        <div className="mt-4 pt-3 border-t border-neutral-200 bg-neutral-50 p-3 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-neutral-900 font-mono">
                              Pick New Slot for Rescheduling (Date: {selectedDate}):
                            </span>
                            <button
                              onClick={() => setReschedulingAppointmentId(null)}
                              className="text-xs text-neutral-500 hover:text-neutral-800"
                            >
                              Close
                            </button>
                          </div>

                          {rescheduleLoading && (
                            <div className="py-2 text-xs font-mono text-neutral-500">
                              Loading available doctor slots...
                            </div>
                          )}

                          {!rescheduleLoading && rescheduleDoctorSlots.length === 0 && (
                            <p className="text-xs text-neutral-500 font-mono py-2">
                              No slots available on {selectedDate}. Adjust date in the left drawer.
                            </p>
                          )}

                          {!rescheduleLoading && rescheduleDoctorSlots.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 scrollbar-thin">
                                {rescheduleDoctorSlots
                                  .filter((s) => s.available)
                                  .map((slot) => {
                                    const isSelected =
                                      selectedRescheduleSlot?.startAt === slot.startAt;
                                    return (
                                      <button
                                        key={slot.startAt}
                                        type="button"
                                        onClick={() => setSelectedRescheduleSlot(slot)}
                                        className={`flex-shrink-0 px-2.5 py-1.5 text-xs font-mono rounded border transition-colors ${
                                          isSelected
                                            ? 'bg-neutral-900 text-white border-neutral-900'
                                            : 'bg-white border-neutral-300 text-neutral-800 hover:border-emerald-600'
                                        }`}
                                      >
                                        <div>{slot.viewerTime.formattedStart}</div>
                                        <div className="text-[10px] opacity-75">
                                          {slot.viewerTime.offset}
                                        </div>
                                      </button>
                                    );
                                  })}
                              </div>

                              {selectedRescheduleSlot && (
                                <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-200">
                                  <span className="text-xs text-neutral-700 font-mono">
                                    Selected: {selectedRescheduleSlot.viewerTime.formattedRange}
                                  </span>
                                  <button
                                    onClick={() => handleConfirmReschedule(app._id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium"
                                  >
                                    Confirm Atomic Slot Swap
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Audit Trail Modal/Card */}
            {selectedAuditAppId && (
              <div className="mt-6 p-4 bg-neutral-900 text-neutral-100 rounded border border-neutral-800">
                <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
                  <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">
                    Appointment Audit Trail (ID: {selectedAuditAppId})
                  </span>
                  <button
                    onClick={() => setSelectedAuditAppId(null)}
                    className="text-xs text-neutral-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-400 font-mono">No audit trail entries.</p>
                ) : (
                  <div className="space-y-2 text-xs font-mono">
                    {auditLogs.map((log) => (
                      <div
                        key={log._id}
                        className="p-2.5 bg-neutral-800 rounded border border-neutral-700/60 flex items-start justify-between"
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
      </div>
    </div>
  );
};
