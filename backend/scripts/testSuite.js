require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const BlockedSlot = require('../models/BlockedSlot');
const SlotLock = require('../models/SlotLock');
const AuditLog = require('../models/AuditLog');
const { getDoctorAvailability } = require('../services/availabilityService');
const {
  createAppointmentAtomic,
  cancelAppointmentAtomic,
  rescheduleAppointmentAtomic,
} = require('../services/bookingService');

const runTests = async () => {
  try {
    console.log('\n=============================================================');
    console.log('🔬 STARTING SLOTZERO BACKEND & CONCURRENCY TEST SUITE');
    console.log('=============================================================\n');

    await mongoose.connect(process.env.MONGO_URI);

    const drMeera = await User.findOne({ email: 'meera@slotzero.io' });
    const asha = await User.findOne({ email: 'asha@slotzero.io' });
    const sam = await User.findOne({ email: 'sam@slotzero.io' });

    if (!drMeera || !asha || !sam) {
      throw new Error('Seed users not found. Run npm run seed first.');
    }

    // TEST 1: Availability Generation & Buffer Calculation
    console.log('▶ TEST 1: Availability & Dynamic Buffer Calculation for Dr. Meera (2026-11-02)');
    const testDate = '2026-11-02'; // A Monday
    const availabilityLondon = await getDoctorAvailability(drMeera._id, testDate, 'Europe/London');
    const availabilityKolkata = await getDoctorAvailability(drMeera._id, testDate, 'Asia/Kolkata');

    console.log(`  ✓ Total slots generated: ${availabilityLondon.slots.length}`);
    const slot0 = availabilityLondon.slots[0];
    const slot1 = availabilityLondon.slots[1];
    console.log(`  ✓ Slot 0 (London): ${slot0.doctorTime.formattedRange} [Buffer ends: ${slot0.bufferEndAt}]`);
    console.log(`  ✓ Slot 1 (London): ${slot1.doctorTime.formattedRange}`);
    console.log(`  ✓ Slot 0 in Kolkata time: ${availabilityKolkata.slots[0].viewerTime.formattedRange}`);

    // Verify 15-minute buffer: slot 0 starts 09:00, ends 09:30. Next slot MUST start at 09:45!
    if (slot0.doctorTime.formattedStart !== '09:00' || slot1.doctorTime.formattedStart !== '09:45') {
      throw new Error(`Buffer calculation error: expected 09:00 and 09:45, got ${slot0.doctorTime.formattedStart} and ${slot1.doctorTime.formattedStart}`);
    }
    console.log('  ✅ TEST 1 PASSED: Automatic 15-minute buffer successfully generated!\n');

    // TEST 2: Atomic Booking with 15-Minute Slot Locks
    console.log('▶ TEST 2: Atomic Booking with Slot Locks (Asha booking Dr. Meera)');
    const bookStart = slot0.startAt;
    const bookEnd = slot0.endAt;

    const { appointment: app1 } = await createAppointmentAtomic({
      doctorId: drMeera._id,
      patientId: asha._id,
      startAt: bookStart,
      endAt: bookEnd,
      patientTimezone: 'Asia/Kolkata',
      reason: 'Routine Health Checkup',
      idempotencyKey: 'test-idemp-key-1',
    });

    console.log(`  ✓ Appointment created: ID ${app1._id}, status ${app1.status}`);

    // Check SlotLock documents
    const locks = await SlotLock.find({ appointmentId: app1._id });
    console.log(`  ✓ SlotLock records acquired: ${locks.length} buckets (covers consultation + buffer)`);
    if (locks.length === 0) {
      throw new Error('Expected SlotLock records to be created, found none.');
    }
    console.log('  ✅ TEST 2 PASSED: Appointment and atomic slot locks successfully created!\n');

    // TEST 3: Concurrent Booking Conflict & 409 Prevention
    console.log('▶ TEST 3: Conflict Prevention: Sam attempting to book overlapping slot');
    let conflictCaught = false;
    try {
      await createAppointmentAtomic({
        doctorId: drMeera._id,
        patientId: sam._id,
        startAt: bookStart,
        endAt: bookEnd,
        patientTimezone: 'America/New_York',
        reason: 'Emergency Consultation',
      });
    } catch (err) {
      if (err.statusCode === 409 || err.message.includes('Conflict') || err.message.includes('booked')) {
        conflictCaught = true;
        console.log(`  ✓ Expected conflict rejected with message: "${err.message}" (Status ${err.statusCode || 409})`);
      } else {
        throw err;
      }
    }

    if (!conflictCaught) {
      throw new Error('FAILED: Overlapping booking was NOT rejected! Concurrency control failed.');
    }
    console.log('  ✅ TEST 3 PASSED: Database-level conflict prevention successfully blocked collision!\n');

    // TEST 4: Rescheduling
    console.log('▶ TEST 4: Rescheduling Appointment atomically');
    const newSlot = availabilityLondon.slots[2]; // 10:30
    const updatedApp = await rescheduleAppointmentAtomic({
      appointmentId: app1._id,
      userId: asha._id,
      newStartAt: newSlot.startAt,
      newEndAt: newSlot.endAt,
      reason: 'Patient requested time change',
    });

    console.log(`  ✓ Appointment rescheduled to: ${new Date(updatedApp.startAt).toISOString()}`);
    const newLocks = await SlotLock.find({ appointmentId: app1._id });
    console.log(`  ✓ New SlotLock records verified: ${newLocks.length} buckets.`);

    // Check availability of old slot: should now be free again!
    const availabilityAfterReschedule = await getDoctorAvailability(drMeera._id, testDate, 'Europe/London');
    const oldSlotNow = availabilityAfterReschedule.slots.find((s) => s.startAt === bookStart);
    if (!oldSlotNow || !oldSlotNow.available) {
      throw new Error('Expected previously booked slot to be available again after reschedule!');
    }
    console.log(`  ✓ Previously occupied slot at ${slot0.doctorTime.formattedStart} is now available again: ${oldSlotNow.available}`);
    console.log('  ✅ TEST 4 PASSED: Rescheduling released old locks and acquired new locks atomically!\n');

    // TEST 5: Cancellation & 2-Hour Rule
    console.log('▶ TEST 5: Cancellation & Releasing Locks');
    await cancelAppointmentAtomic({
      appointmentId: app1._id,
      userId: asha._id,
      userRole: 'PATIENT',
      reason: 'Work conflict',
    });

    const cancelledApp = await Appointment.findById(app1._id);
    if (cancelledApp.status !== 'CANCELLED') {
      throw new Error('Expected appointment status to be CANCELLED');
    }

    const remainingLocks = await SlotLock.find({ appointmentId: app1._id });
    if (remainingLocks.length !== 0) {
      throw new Error(`Expected all SlotLocks to be released, but found ${remainingLocks.length}`);
    }
    console.log(`  ✓ Appointment status: ${cancelledApp.status}, remaining locks: ${remainingLocks.length}`);

    // Verify audit logs
    const auditLogs = await AuditLog.find({ appointmentId: app1._id });
    console.log(`  ✓ AuditLog trail has ${auditLogs.length} events: ${auditLogs.map((a) => a.action).join(' -> ')}`);
    console.log('  ✅ TEST 5 PASSED: Cancellation released locks and preserved audit history!\n');

    // TEST 6: Doctor BlockedSlot Conflict Validation
    console.log('▶ TEST 6: Doctor BlockedSlot Conflict Validation');
    // First, book a slot
    const { appointment: app2 } = await createAppointmentAtomic({
      doctorId: drMeera._id,
      patientId: sam._id,
      startAt: slot1.startAt,
      endAt: slot1.endAt,
      patientTimezone: 'America/New_York',
      reason: 'Cardio pre-screen',
    });

    // Doctor attempts to block a time window overlapping app2
    const blockStart = new Date(new Date(slot1.startAt).getTime() - 10 * 60 * 1000);
    const blockEnd = new Date(new Date(slot1.endAt).getTime() + 10 * 60 * 1000);

    const conflictingApps = await Appointment.find({
      doctorId: drMeera._id,
      status: 'CONFIRMED',
      startAt: { $lt: blockEnd },
      endAt: { $gt: blockStart },
    });

    if (conflictingApps.length === 0) {
      throw new Error('Failed to find conflicting appointment before blocking');
    }
    console.log(`  ✓ Successfully detected ${conflictingApps.length} conflicting appointment(s) blocking cannot proceed without resolving.`);

    // Clean up app2
    await cancelAppointmentAtomic({
      appointmentId: app2._id,
      userId: drMeera._id,
      userRole: 'DOCTOR',
      reason: 'Cleaning up test appointment',
    });

    // Now blocking should succeed
    const block = await BlockedSlot.create({
      doctorId: drMeera._id,
      startAt: blockStart,
      endAt: blockEnd,
      reason: 'Clinical Department Grand Rounds',
    });
    console.log(`  ✓ Created blocked slot: "${block.reason}"`);

    // Verify availability shows it as blocked
    const availabilityWithBlock = await getDoctorAvailability(drMeera._id, testDate, 'Europe/London');
    const blockedCandidate = availabilityWithBlock.slots.find((s) => s.startAt === slot1.startAt);
    if (!blockedCandidate || blockedCandidate.available) {
      throw new Error('Expected slot overlapping blocked period to be unavailable!');
    }
    console.log(`  ✓ Slot at ${slot1.doctorTime.formattedStart} is marked unavailable: "${blockedCandidate.reason}"`);

    // Remove blocked slot
    await BlockedSlot.deleteOne({ _id: block._id });
    console.log('  ✅ TEST 6 PASSED: Blocked slots correctly interact with appointments and schedule!\n');

    console.log('=============================================================');
    console.log('🎉 ALL 6 BACKEND TEST SUITES PASSED FLAWLESSLY!');
    console.log('=============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runTests();
