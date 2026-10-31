import React, { useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { Clock, ShieldCheck, AlertCircle, CheckCircle2, ChevronRight, Lock } from 'lucide-react';

export const InlineSlotPicker = ({
  doctor,
  selectedDate,
  viewingTimezone,
  onBookingComplete,
}) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reason, setReason] = useState('Routine Medical Consultation');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  const fetchSlots = async () => {
    if (!doctor?.id || !selectedDate) return;
    setLoading(true);
    setConflictError(null);
    setSelectedSlot(null);

    try {
      const { data } = await api.get(
        `/doctors/${doctor.id}/availability?date=${selectedDate}&timezone=${viewingTimezone}`
      );
      if (data.success) {
        setSlots(data.data.slots || []);
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      toast.error(err.message || 'Could not fetch availability slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [doctor?.id, selectedDate, viewingTimezone]);

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;
    setBookingLoading(true);
    setConflictError(null);

    // Generate unique idempotency key
    const idempotencyKey = `bk_${doctor.id}_${new Date(selectedSlot.startAt).getTime()}_${Date.now()}`;

    try {
      const { data } = await api.post('/appointments', {
        doctorId: doctor.id,
        startAt: selectedSlot.startAt,
        endAt: selectedSlot.endAt,
        patientTimezone: viewingTimezone,
        reason: reason.trim() || 'General Medical Consultation',
        idempotencyKey,
      });

      if (data.success) {
        toast.success(
          `Appointment confirmed for ${selectedSlot.viewerTime.formattedRange} with ${doctor.name}!`
        );
        setSelectedSlot(null);
        await fetchSlots(); // Refresh slots to show newly booked state
        if (onBookingComplete) {
          onBookingComplete(data.data);
        }
      }
    } catch (err) {
      if (err.status === 409) {
        setConflictError(
          err.message ||
            'Concurrent Booking Conflict: This slot was just locked by another concurrent patient. The availability calendar has been refreshed.'
        );
        toast.error('Conflict: Slot no longer available');
        await fetchSlots(); // Refresh calendar to reflect the conflict
      } else {
        toast.error(err.message || 'Booking failed');
      }
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-neutral-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-neutral-800 tracking-tight">
            Schedule for {selectedDate}:
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            Timezone: {viewingTimezone}
          </span>
        </div>

        {/* Micro chips legend */}
        <div className="flex items-center space-x-3 text-[10px] font-mono text-neutral-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-emerald-100 border border-emerald-400"></span>
            Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-neutral-100 border border-neutral-300"></span>
            Booked / Buffer
          </span>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-4 text-center text-xs font-mono text-neutral-500 flex items-center justify-center space-x-2">
          <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Computing working intervals and dynamic break times...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && slots.length === 0 && (
        <div className="py-3 px-3.5 bg-neutral-100/70 rounded border border-neutral-200">
          <p className="text-xs text-neutral-800 font-medium">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })} is a scheduled day off for {doctor.name}.
          </p>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Clinic hours are active Monday–Friday. Select a weekday (e.g. Mon Nov 2) in the left drawer to book.
          </p>
        </div>
      )}

      {/* Horizontal micro-chips strip (Anti-modal design constraint) */}
      {!loading && slots.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
          {slots.map((slot, index) => {
            const isAvailable = slot.available;
            const isSelected = selectedSlot?.startAt === slot.startAt;

            return (
              <button
                key={`${slot.startAt}-${index}`}
                disabled={!isAvailable}
                onClick={() => {
                  setSelectedSlot(isSelected ? null : slot);
                  setConflictError(null);
                }}
                className={`flex-shrink-0 px-2.5 py-1.5 text-xs font-mono rounded border transition-all text-left ${
                  isSelected
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                    : isAvailable
                    ? 'bg-emerald-50/70 border-emerald-600/40 text-emerald-900 hover:bg-emerald-100/80 hover:border-emerald-600 cursor-pointer'
                    : 'bg-neutral-100/80 border-neutral-200 text-neutral-400 cursor-not-allowed line-through opacity-70'
                }`}
                title={
                  isAvailable
                    ? `Click to book ${slot.viewerTime.formattedRange} (Doctor: ${slot.doctorTime.formattedRange})`
                    : slot.reason || 'Occupied / Automatic buffer interval'
                }
              >
                <div className="font-semibold leading-tight">
                  {slot.viewerTime.formattedStart}
                </div>
                <div className="text-[10px] opacity-75">
                  {slot.viewerTime.offset}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Conflict error banner if concurrent booking rejected */}
      {conflictError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Concurrent Booking Conflict</span>
            <p className="mt-0.5 text-red-700 text-[11px] leading-relaxed">
              {conflictError}
            </p>
          </div>
        </div>
      )}

      {/* Inline Anti-Modal Booking Confirmation Drawer */}
      {selectedSlot && (
        <div className="mt-3 p-3.5 bg-neutral-900 text-neutral-100 rounded-md border border-neutral-800 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-emerald-300 uppercase tracking-wider">
                Confirm Reservation & Acquire 15-Min Slot Locks
              </span>
            </div>
            <span className="text-[10px] font-mono bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">
              Fee: ${doctor.consultationFee}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-3">
            <div className="bg-neutral-800/80 p-2.5 rounded border border-neutral-700/60">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">
                Your Timezone ({viewingTimezone})
              </span>
              <span className="font-semibold text-white text-sm mt-0.5 block font-mono">
                {selectedSlot.viewerTime.formattedRange}
              </span>
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Date: {selectedDate} ({doctor.appointmentDuration} min duration)
              </span>
            </div>

            <div className="bg-neutral-800/80 p-2.5 rounded border border-neutral-700/60">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">
                Doctor's Timezone ({selectedSlot.doctorTime.timezone})
              </span>
              <span className="font-semibold text-white text-sm mt-0.5 block font-mono">
                {selectedSlot.doctorTime.formattedRange}
              </span>
              <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
                + {selectedSlot.bufferMinutes}m guaranteed post-visit buffer
              </span>
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">
              Consultation Purpose / Clinical Reason:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual cardiology screening, ECG follow-up"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setSelectedSlot(null)}
              className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded transition-colors"
            >
              Cancel
            </button>

            <button
              disabled={bookingLoading}
              onClick={handleConfirmBooking}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              {bookingLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Locking Slot in DB...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm & Lock Appointment</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
