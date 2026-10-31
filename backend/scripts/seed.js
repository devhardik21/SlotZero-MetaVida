require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const BlockedSlot = require('../models/BlockedSlot');
const SlotLock = require('../models/SlotLock');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Seed] Connected.');

    // Ensure indexes
    console.log('[Seed] Syncing indexes...');
    await Promise.all([
      User.syncIndexes(),
      DoctorProfile.syncIndexes(),
      Appointment.syncIndexes(),
      BlockedSlot.syncIndexes(),
      SlotLock.syncIndexes(),
      AuditLog.syncIndexes(),
    ]);

    // Clear existing data
    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      DoctorProfile.deleteMany({}),
      Appointment.deleteMany({}),
      BlockedSlot.deleteMany({}),
      SlotLock.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const salt = await bcrypt.genSalt(10);
    const demoPassword = await bcrypt.hash('demoPassword123!', salt);

    // 1. Dr. Meera
    const drMeera = await User.create({
      name: 'Dr. Meera Patel',
      email: 'meera@slotzero.io',
      password: demoPassword,
      role: 'DOCTOR',
      timezone: 'Europe/London',
    });

    const standardWeekdays = [
      { day: 'Monday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
      { day: 'Tuesday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
      { day: 'Wednesday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
      { day: 'Thursday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
      { day: 'Friday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
      { day: 'Saturday', enabled: false, intervals: [] },
      { day: 'Sunday', enabled: false, intervals: [] },
    ];

    await DoctorProfile.create({
      userId: drMeera._id,
      specialization: 'General Physician',
      experience: 12,
      consultationFee: 90,
      bio: 'NHS senior attending general practitioner specializing in preventative medicine, diagnostics, and chronic disease management.',
      appointmentDuration: 30,
      bufferTime: {
        enabled: true,
        duration: 15,
      },
      workingHours: standardWeekdays,
      timezone: 'Europe/London',
    });

    // 2. Dr. Alex
    const drAlex = await User.create({
      name: 'Dr. Alex Vance',
      email: 'alex@slotzero.io',
      password: demoPassword,
      role: 'DOCTOR',
      timezone: 'America/New_York',
    });

    await DoctorProfile.create({
      userId: drAlex._id,
      specialization: 'Cardiologist',
      experience: 16,
      consultationFee: 175,
      bio: 'Board-certified clinical and interventional cardiologist focusing on cardiac imaging, hypertension management, and preventative cardiology.',
      appointmentDuration: 30,
      bufferTime: {
        enabled: true,
        duration: 10,
      },
      workingHours: standardWeekdays,
      timezone: 'America/New_York',
    });

    // 3. Asha (Patient)
    const asha = await User.create({
      name: 'Asha Sharma',
      email: 'asha@slotzero.io',
      password: demoPassword,
      role: 'PATIENT',
      timezone: 'Asia/Kolkata',
    });

    // 4. Sam (Patient)
    const sam = await User.create({
      name: 'Sam Miller',
      email: 'sam@slotzero.io',
      password: demoPassword,
      role: 'PATIENT',
      timezone: 'America/New_York',
    });

    console.log('✅ Demo accounts seeded successfully:');
    console.log('----------------------------------------------------');
    console.log('Doctor 1: Dr. Meera Patel');
    console.log('  Email:    meera@slotzero.io');
    console.log('  Password: demoPassword123!');
    console.log('  Role:     DOCTOR (Europe/London)');
    console.log('  Settings: 30m consultation, 15m buffer');
    console.log('----------------------------------------------------');
    console.log('Doctor 2: Dr. Alex Vance');
    console.log('  Email:    alex@slotzero.io');
    console.log('  Password: demoPassword123!');
    console.log('  Role:     DOCTOR (America/New_York)');
    console.log('  Settings: 30m consultation, 10m buffer');
    console.log('----------------------------------------------------');
    console.log('Patient 1: Asha Sharma');
    console.log('  Email:    asha@slotzero.io');
    console.log('  Password: demoPassword123!');
    console.log('  Role:     PATIENT (Asia/Kolkata)');
    console.log('----------------------------------------------------');
    console.log('Patient 2: Sam Miller');
    console.log('  Email:    sam@slotzero.io');
    console.log('  Password: demoPassword123!');
    console.log('  Role:     PATIENT (America/New_York)');
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    console.log('[Seed] Database disconnected cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedData();
