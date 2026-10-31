const { DateTime } = require('luxon');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const BlockedSlot = require('../models/BlockedSlot');

const SUPPORTED_TIMEZONES = ['Asia/Kolkata', 'Europe/London', 'America/New_York'];

/**
 * Validates whether a timezone is supported
 */
const isValidTimezone = (tz) => SUPPORTED_TIMEZONES.includes(tz);

/**
 * Generates available appointment slots for a doctor on a specific date.
 *
 * @param {string} doctorId - Doctor's user ID
 * @param {string} dateStr - Date formatted as YYYY-MM-DD
 * @param {string} viewerTimezone - Timezone to format slots for (default: doctor's timezone)
 */
const getDoctorAvailability = async (doctorId, dateStr, viewerTimezone = null) => {
  const profile = await DoctorProfile.findOne({ userId: doctorId }).populate('userId', 'name email timezone');
  if (!profile) {
    throw new Error('Doctor profile not found');
  }

  const doctorTz = profile.timezone;
  const targetTz = viewerTimezone && isValidTimezone(viewerTimezone) ? viewerTimezone : doctorTz;

  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }

  // Parse date in doctor's timezone
  const startOfDay = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: doctorTz });
  if (!startOfDay.isValid) {
    throw new Error('Invalid date or nonexistent time during daylight saving transition');
  }

  const endOfDay = startOfDay.endOf('day');
  const dayOfWeekName = startOfDay.toFormat('cccc'); // 'Monday', 'Tuesday', etc.

  // Find working hours for this day of week
  const scheduleForDay = profile.workingHours.find(
    (w) => w.day.toLowerCase() === dayOfWeekName.toLowerCase() && w.enabled
  );

  if (!scheduleForDay || !scheduleForDay.intervals || scheduleForDay.intervals.length === 0) {
    return {
      date: dateStr,
      dayOfWeek: dayOfWeekName,
      doctorTimezone: doctorTz,
      viewerTimezone: targetTz,
      doctor: {
        id: profile.userId._id,
        name: profile.userId.name,
        specialization: profile.specialization,
        appointmentDuration: profile.appointmentDuration,
        bufferTime: profile.bufferTime,
      },
      slots: [],
    };
  }

  const appointmentDuration = profile.appointmentDuration || 30;
  const bufferEnabled = profile.bufferTime?.enabled ?? true;
  const bufferDuration = bufferEnabled ? (profile.bufferTime?.duration ?? 15) : 0;

  // Candidate generation range in UTC
  const startOfDayUtc = startOfDay.toUTC().toJSDate();
  const endOfDayUtc = endOfDay.toUTC().toJSDate();

  // Fetch confirmed appointments and blocked slots overlapping with this day
  const [confirmedAppointments, blockedSlots] = await Promise.all([
    Appointment.find({
      doctorId,
      status: 'CONFIRMED',
      startAt: { $lt: endOfDayUtc },
      endAt: { $gt: startOfDayUtc },
    }),
    BlockedSlot.find({
      doctorId,
      startAt: { $lt: endOfDayUtc },
      endAt: { $gt: startOfDayUtc },
    }),
  ]);

  const candidateSlots = [];

  for (const interval of scheduleForDay.intervals) {
    const [startH, startM] = interval.start.split(':').map(Number);
    const [endH, endM] = interval.end.split(':').map(Number);

    let intervalStart = startOfDay.set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
    const intervalEnd = startOfDay.set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

    if (!intervalStart.isValid || !intervalEnd.isValid) {
      continue;
    }

    let cursor = intervalStart;

    while (true) {
      const consultationEnd = cursor.plus({ minutes: appointmentDuration });
      // Consultation itself must fit completely inside the working interval
      if (consultationEnd > intervalEnd) {
        break;
      }

      // Calculate buffer
      const bufferEnd = bufferEnabled ? consultationEnd.plus({ minutes: bufferDuration }) : consultationEnd;
      // "Never apply buffer time beyond the doctor's working interval"
      const effectiveBufferEnd = bufferEnd > intervalEnd ? intervalEnd : bufferEnd;

      const candStartUtc = cursor.toUTC().toJSDate();
      const candEndUtc = consultationEnd.toUTC().toJSDate();
      const candBufferEndUtc = effectiveBufferEnd.toUTC().toJSDate();

      // Check conflict with BlockedSlots
      // Overlap condition: candStart < blockEnd && candEffectiveBufferEnd > blockStart
      const blockConflict = blockedSlots.find((block) => {
        return candStartUtc < block.endAt && candBufferEndUtc > block.startAt;
      });

      // Check conflict with Confirmed Appointments
      // Consider consultation interval and associated required buffer
      const appointmentConflict = confirmedAppointments.find((app) => {
        // App's consultation window
        const appStartUtc = app.startAt;
        const appEndUtc = app.endAt;
        // App's required buffer after consultation
        const appBufferEndUtc = bufferEnabled
          ? new Date(appEndUtc.getTime() + bufferDuration * 60 * 1000)
          : appEndUtc;

        // 1. Direct consultation overlap
        const directConsultationOverlap = candStartUtc < appEndUtc && candEndUtc > appStartUtc;
        if (directConsultationOverlap) return true;

        // 2. Candidate starts during active appointment's required buffer
        const startsInBuffer = candStartUtc < appBufferEndUtc && candStartUtc >= appEndUtc;
        if (startsInBuffer) return true;

        // 3. Candidate's buffer intrudes into subsequent appointment's consultation
        const bufferIntrudesNextApp = candBufferEndUtc > appStartUtc && candEndUtc <= appStartUtc;
        if (bufferIntrudesNextApp) return true;

        return false;
      });

      const isConflict = Boolean(blockConflict || appointmentConflict);

      const doctorStartDt = cursor.setZone(doctorTz);
      const doctorEndDt = consultationEnd.setZone(doctorTz);
      const viewerStartDt = cursor.setZone(targetTz);
      const viewerEndDt = consultationEnd.setZone(targetTz);

      candidateSlots.push({
        startAt: candStartUtc.toISOString(),
        endAt: candEndUtc.toISOString(),
        bufferEndAt: candBufferEndUtc.toISOString(),
        durationMinutes: appointmentDuration,
        bufferMinutes: bufferDuration,
        available: !isConflict,
        reason: isConflict
          ? blockConflict
            ? `Doctor Blocked: ${blockConflict.reason}`
            : 'Booked / Buffer Occupied'
          : null,
        doctorTime: {
          timezone: doctorTz,
          offset: doctorStartDt.offsetNameShort || doctorStartDt.zoneName,
          formattedStart: doctorStartDt.toFormat('HH:mm'),
          formattedEnd: doctorEndDt.toFormat('HH:mm'),
          formattedRange: `${doctorStartDt.toFormat('HH:mm')} - ${doctorEndDt.toFormat('HH:mm')} (${doctorStartDt.offsetNameShort || doctorTz})`,
        },
        viewerTime: {
          timezone: targetTz,
          offset: viewerStartDt.offsetNameShort || viewerStartDt.zoneName,
          formattedStart: viewerStartDt.toFormat('HH:mm'),
          formattedEnd: viewerEndDt.toFormat('HH:mm'),
          formattedRange: `${viewerStartDt.toFormat('HH:mm')} - ${viewerEndDt.toFormat('HH:mm')} (${viewerStartDt.offsetNameShort || targetTz})`,
        },
      });

      // Move cursor forward to the next candidate start
      cursor = effectiveBufferEnd;
    }
  }

  return {
    date: dateStr,
    dayOfWeek: dayOfWeekName,
    doctorTimezone: doctorTz,
    viewerTimezone: targetTz,
    doctor: {
      id: profile.userId._id,
      name: profile.userId.name,
      specialization: profile.specialization,
      appointmentDuration,
      bufferTime: {
        enabled: bufferEnabled,
        duration: bufferDuration,
      },
      consultationFee: profile.consultationFee,
    },
    slots: candidateSlots,
  };
};

module.exports = {
  getDoctorAvailability,
  isValidTimezone,
  SUPPORTED_TIMEZONES,
};
