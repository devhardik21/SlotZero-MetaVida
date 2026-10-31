const mongoose = require('mongoose');
const { DateTime } = require('luxon');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const BlockedSlot = require('../models/BlockedSlot');
const SlotLock = require('../models/SlotLock');
const AuditLog = require('../models/AuditLog');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/**
 * Calculates 15-minute bucket timestamps for a given consultation and buffer interval
 */
const calculateSlotLockBuckets = (startAt, endAt, bufferMinutes = 0) => {
  const buckets = [];
  const startMs = new Date(startAt).getTime();
  const endWithBufferMs = new Date(endAt).getTime() + (bufferMinutes * 60 * 1000);

  let currentMs = startMs;
  while (currentMs < endWithBufferMs) {
    buckets.push(new Date(currentMs));
    currentMs += FIFTEEN_MINUTES_MS;
  }
  return buckets;
};

/**
 * Validates that a requested slot conforms to doctor's working schedule and buffer rules
 */
const validateSlotAgainstSchedule = async (doctorId, startAtDate, endAtDate) => {
  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile) {
    throw new Error('Doctor profile not found');
  }

  const doctorTz = profile.timezone;
  const slotStartDt = DateTime.fromJSDate(startAtDate, { zone: doctorTz });
  const slotEndDt = DateTime.fromJSDate(endAtDate, { zone: doctorTz });

  if (!slotStartDt.isValid || !slotEndDt.isValid) {
    throw new Error('Invalid appointment date/time or ambiguous daylight saving change');
  }

  // Ensure slot duration matches doctor's configured appointment duration
  const diffMinutes = Math.round(slotEndDt.diff(slotStartDt, 'minutes').minutes);
  if (diffMinutes !== profile.appointmentDuration) {
    throw new Error(
      `Invalid appointment duration (${diffMinutes} min). Doctor consultation duration is configured for ${profile.appointmentDuration} min.`
    );
  }

  // Check working day
  const dayName = slotStartDt.toFormat('cccc');
  const daySchedule = profile.workingHours.find(
    (w) => w.day.toLowerCase() === dayName.toLowerCase() && w.enabled
  );

  if (!daySchedule || !daySchedule.intervals || daySchedule.intervals.length === 0) {
    throw new Error(`Doctor is not scheduled to work on ${dayName}`);
  }

  // Check if slot falls completely within one of the working intervals
  const slotStartFormatted = slotStartDt.toFormat('HH:mm');
  const slotEndFormatted = slotEndDt.toFormat('HH:mm');

  const fitsInInterval = daySchedule.intervals.some(
    (interval) => slotStartFormatted >= interval.start && slotEndFormatted <= interval.end
  );

  if (!fitsInInterval) {
    throw new Error(
      `Appointment time (${slotStartFormatted} - ${slotEndFormatted}) is outside doctor's configured working hours`
    );
  }

  return profile;
};

/**
 * Creates an appointment with atomic slot locks inside a MongoDB transaction
 */
const createAppointmentAtomic = async ({
  doctorId,
  patientId,
  startAt,
  endAt,
  patientTimezone,
  reason,
  idempotencyKey,
}) => {
  const startAtDate = new Date(startAt);
  const endAtDate = new Date(endAt);

  if (isNaN(startAtDate.getTime()) || isNaN(endAtDate.getTime())) {
    const err = new Error('Invalid startAt or endAt timestamp');
    err.statusCode = 400;
    throw err;
  }

  if (startAtDate >= endAtDate) {
    const err = new Error('Appointment start time must be before end time');
    err.statusCode = 400;
    throw err;
  }

  if (startAtDate < new Date()) {
    const err = new Error('Cannot book appointments in the past');
    err.statusCode = 400;
    throw err;
  }

  // Idempotency check: if request was already processed, return existing appointment
  if (idempotencyKey) {
    const existingApp = await Appointment.findOne({
      idempotencyKey,
      patientId,
      status: 'CONFIRMED',
    })
      .populate('doctorId', 'name email timezone')
      .populate('patientId', 'name email timezone');

    if (existingApp) {
      return { appointment: existingApp, isDuplicate: true };
    }
  }

  // Validate against doctor's working hours
  const doctorProfile = await validateSlotAgainstSchedule(doctorId, startAtDate, endAtDate);
  const bufferEnabled = doctorProfile.bufferTime?.enabled ?? true;
  const bufferDuration = bufferEnabled ? (doctorProfile.bufferTime?.duration ?? 15) : 0;

  // Pre-check BlockedSlot conflicts
  const totalOccupiedEnd = new Date(endAtDate.getTime() + bufferDuration * 60 * 1000);
  const conflictingBlock = await BlockedSlot.findOne({
    doctorId,
    startAt: { $lt: totalOccupiedEnd },
    endAt: { $gt: startAtDate },
  });

  if (conflictingBlock) {
    const err = new Error(`Slot conflicts with doctor's blocked period: ${conflictingBlock.reason}`);
    err.statusCode = 409;
    throw err;
  }

  // Calculate 15-minute slot lock timestamps
  const lockBuckets = calculateSlotLockBuckets(startAtDate, endAtDate, bufferDuration);

  // START MONGODB TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Double check existing confirmed appointments overlapping this window within session
    const existingOverlap = await Appointment.findOne({
      doctorId,
      status: 'CONFIRMED',
      startAt: { $lt: totalOccupiedEnd },
      endAt: { $gt: startAtDate },
    }).session(session);

    if (existingOverlap) {
      const err = new Error('The selected time slot is already booked by another patient.');
      err.statusCode = 409;
      throw err;
    }

    // 2. Create the appointment document
    const [appointment] = await Appointment.create(
      [
        {
          doctorId,
          patientId,
          startAt: startAtDate,
          endAt: endAtDate,
          status: 'CONFIRMED',
          doctorTimezone: doctorProfile.timezone,
          patientTimezone: patientTimezone || 'Asia/Kolkata',
          reason: reason || 'General Consultation',
          idempotencyKey: idempotencyKey || null,
        },
      ],
      { session }
    );

    // 3. Acquire 15-minute slot locks atomically
    // The unique compound index { doctorId: 1, startAt: 1 } will reject any concurrent collisions!
    const slotLocks = lockBuckets.map((bucketTime) => ({
      doctorId,
      appointmentId: appointment._id,
      startAt: bucketTime,
    }));

    await SlotLock.insertMany(slotLocks, { session, ordered: true });

    // 4. Log in AuditLog
    await AuditLog.create(
      [
        {
          appointmentId: appointment._id,
          performedBy: patientId,
          action: 'BOOKED',
          newStartAt: startAtDate,
          details: `Booked appointment for ${startAtDate.toISOString()} with ${bufferDuration}m buffer`,
          performedAt: new Date(),
        },
      ],
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email timezone')
      .populate('patientId', 'name email timezone');

    return { appointment: populatedAppointment, isDuplicate: false };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // Check for duplicate key error on SlotLock
    if (error.code === 11000) {
      const conflictErr = new Error(
        'Concurrent Booking Conflict: Another patient has just reserved this time slot. Please choose another slot.'
      );
      conflictErr.statusCode = 409;
      throw conflictErr;
    }

    throw error;
  }
};

/**
 * Cancels an appointment and releases its slot locks atomically
 */
const cancelAppointmentAtomic = async ({ appointmentId, userId, userRole, reason }) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  // Authorization check: only owner (patient or doctor) can cancel
  const isDoctor = appointment.doctorId.toString() === userId.toString();
  const isPatient = appointment.patientId.toString() === userId.toString();

  if (!isDoctor && !isPatient) {
    const err = new Error('Forbidden: You can only cancel your own appointments');
    err.statusCode = 403;
    throw err;
  }

  if (appointment.status === 'CANCELLED') {
    const err = new Error('This appointment has already been cancelled');
    err.statusCode = 400;
    throw err;
  }

  // Cancellation rule: Patients can cancel up to 2 hours before appointment start
  if (isPatient && !isDoctor) {
    const now = new Date();
    const appStart = new Date(appointment.startAt);
    const twoHoursBefore = new Date(appStart.getTime() - 2 * 60 * 60 * 1000);

    if (now > twoHoursBefore) {
      const err = new Error(
        'Cancellation deadline passed: Patients can only cancel up to 2 hours before the scheduled appointment start time'
      );
      err.statusCode = 400;
      throw err;
    }
  }

  // Execute atomic cancellation transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    appointment.status = 'CANCELLED';
    await appointment.save({ session });

    // Release all slot locks associated with this appointment
    await SlotLock.deleteMany({ appointmentId: appointment._id }).session(session);

    // Audit log
    await AuditLog.create(
      [
        {
          appointmentId: appointment._id,
          performedBy: userId,
          action: 'CANCELLED',
          previousStartAt: appointment.startAt,
          details: reason || 'Cancelled by user',
          performedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return appointment;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Reschedules an appointment by releasing old locks and acquiring new locks atomically
 */
const rescheduleAppointmentAtomic = async ({
  appointmentId,
  userId,
  newStartAt,
  newEndAt,
  reason,
}) => {
  const appointment = await Appointment.findById(appointmentId);
  if (!appointment) {
    const err = new Error('Appointment not found');
    err.statusCode = 404;
    throw err;
  }

  // Ownership check
  const isDoctor = appointment.doctorId.toString() === userId.toString();
  const isPatient = appointment.patientId.toString() === userId.toString();

  if (!isDoctor && !isPatient) {
    const err = new Error('Forbidden: You can only reschedule your own appointments');
    err.statusCode = 403;
    throw err;
  }

  if (appointment.status === 'CANCELLED') {
    const err = new Error('Cannot reschedule a cancelled appointment');
    err.statusCode = 400;
    throw err;
  }

  const newStartDate = new Date(newStartAt);
  const newEndDate = new Date(newEndAt);

  if (isNaN(newStartDate.getTime()) || isNaN(newEndDate.getTime())) {
    const err = new Error('Invalid new startAt or endAt timestamp');
    err.statusCode = 400;
    throw err;
  }

  if (newStartDate < new Date()) {
    const err = new Error('Cannot reschedule to a past time slot');
    err.statusCode = 400;
    throw err;
  }

  // Validate new slot against doctor's working hours
  const doctorProfile = await validateSlotAgainstSchedule(appointment.doctorId, newStartDate, newEndDate);
  const bufferEnabled = doctorProfile.bufferTime?.enabled ?? true;
  const bufferDuration = bufferEnabled ? (doctorProfile.bufferTime?.duration ?? 15) : 0;

  // New slot lock buckets
  const newLockBuckets = calculateSlotLockBuckets(newStartDate, newEndDate, bufferDuration);

  // START TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const previousStartAt = appointment.startAt;

    // 1. Release existing slot locks for this appointment
    await SlotLock.deleteMany({ appointmentId: appointment._id }).session(session);

    // 2. Check blocked slot conflict for new time
    const newOccupiedEnd = new Date(newEndDate.getTime() + bufferDuration * 60 * 1000);
    const conflictingBlock = await BlockedSlot.findOne({
      doctorId: appointment.doctorId,
      startAt: { $lt: newOccupiedEnd },
      endAt: { $gt: newStartDate },
    }).session(session);

    if (conflictingBlock) {
      const err = new Error(`New slot conflicts with doctor's blocked period: ${conflictingBlock.reason}`);
      err.statusCode = 409;
      throw err;
    }

    // 3. Acquire new slot locks
    const newLocks = newLockBuckets.map((bucketTime) => ({
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      startAt: bucketTime,
    }));

    await SlotLock.insertMany(newLocks, { session, ordered: true });

    // 4. Update appointment
    appointment.startAt = newStartDate;
    appointment.endAt = newEndDate;
    await appointment.save({ session });

    // 5. Audit Log
    await AuditLog.create(
      [
        {
          appointmentId: appointment._id,
          performedBy: userId,
          action: 'RESCHEDULED',
          previousStartAt,
          newStartAt: newStartDate,
          details: reason || 'Rescheduled appointment',
          performedAt: new Date(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const updatedApp = await Appointment.findById(appointment._id)
      .populate('doctorId', 'name email timezone')
      .populate('patientId', 'name email timezone');

    return updatedApp;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      const conflictErr = new Error(
        'Concurrent Booking Conflict: The requested reschedule slot is already occupied. Original appointment remains unchanged.'
      );
      conflictErr.statusCode = 409;
      throw conflictErr;
    }

    throw error;
  }
};

module.exports = {
  createAppointmentAtomic,
  cancelAppointmentAtomic,
  rescheduleAppointmentAtomic,
  calculateSlotLockBuckets,
};
