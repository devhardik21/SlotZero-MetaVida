const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const BlockedSlot = require('../models/BlockedSlot');
const Appointment = require('../models/Appointment');
const { getDoctorAvailability } = require('../services/availabilityService');

// @desc    List all doctors with profiles, search & filter
// @route   GET /api/doctors
// @access  Public
const getDoctors = async (req, res, next) => {
  try {
    const { search, specialization } = req.query;

    const query = {};
    if (specialization && specialization !== 'All') {
      query.specialization = new RegExp(specialization, 'i');
    }

    let profiles = await DoctorProfile.find(query).populate('userId', 'name email timezone');

    // Filter out profiles whose user might not exist or isn't DOCTOR
    profiles = profiles.filter((p) => p.userId && p.userId.name);

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      profiles = profiles.filter(
        (p) =>
          searchRegex.test(p.userId.name) ||
          searchRegex.test(p.specialization) ||
          searchRegex.test(p.bio)
      );
    }

    const doctors = profiles.map((p) => ({
      id: p.userId._id,
      profileId: p._id,
      name: p.userId.name,
      email: p.userId.email,
      specialization: p.specialization,
      experience: p.experience,
      consultationFee: p.consultationFee,
      bio: p.bio,
      appointmentDuration: p.appointmentDuration,
      bufferTime: p.bufferTime,
      workingHours: p.workingHours,
      timezone: p.timezone || p.userId.timezone,
    }));

    res.json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor details by user ID
// @route   GET /api/doctors/:id
// @access  Public
const getDoctorById = async (req, res, next) => {
  try {
    const doctorUser = await User.findById(req.params.id);
    if (!doctorUser || doctorUser.role !== 'DOCTOR') {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    const profile = await DoctorProfile.findOne({ userId: doctorUser._id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile configuration not found',
      });
    }

    res.json({
      success: true,
      data: {
        id: doctorUser._id,
        profileId: profile._id,
        name: doctorUser.name,
        email: doctorUser.email,
        specialization: profile.specialization,
        experience: profile.experience,
        consultationFee: profile.consultationFee,
        bio: profile.bio,
        appointmentDuration: profile.appointmentDuration,
        bufferTime: profile.bufferTime,
        workingHours: profile.workingHours,
        timezone: profile.timezone || doctorUser.timezone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor profile (Name, specialization, experience, fee, bio, timezone)
// @route   PUT /api/doctors/profile
// @access  Private (Doctor only)
const updateProfile = async (req, res, next) => {
  try {
    const { name, specialization, experience, consultationFee, bio, timezone } = req.body;

    // Update User model fields
    const userUpdates = {};
    if (name) userUpdates.name = name;
    if (timezone) userUpdates.timezone = timezone;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, userUpdates);
    }

    // Update DoctorProfile
    const profileUpdates = {};
    if (specialization !== undefined) profileUpdates.specialization = specialization;
    if (experience !== undefined) profileUpdates.experience = Number(experience);
    if (consultationFee !== undefined) profileUpdates.consultationFee = Number(consultationFee);
    if (bio !== undefined) profileUpdates.bio = bio;
    if (timezone !== undefined) profileUpdates.timezone = timezone;

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: profileUpdates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Doctor clinical profile updated successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update doctor working hours schedule
// @route   PUT /api/doctors/schedule
// @access  Private (Doctor only)
const updateSchedule = async (req, res, next) => {
  try {
    const { workingHours } = req.body;

    if (!Array.isArray(workingHours)) {
      return res.status(400).json({
        success: false,
        message: 'workingHours must be an array of daily schedules',
      });
    }

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { workingHours } },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Weekly schedule updated successfully',
      data: profile.workingHours,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment duration and buffer settings
// @route   PUT /api/doctors/appointment-settings
// @access  Private (Doctor only)
const updateAppointmentSettings = async (req, res, next) => {
  try {
    const { appointmentDuration, bufferTime } = req.body;

    const updates = {};
    if (appointmentDuration !== undefined) {
      if (![15, 30, 60].includes(Number(appointmentDuration))) {
        return res.status(400).json({
          success: false,
          message: 'Appointment duration must be 15, 30, or 60 minutes',
        });
      }
      updates.appointmentDuration = Number(appointmentDuration);
    }

    if (bufferTime !== undefined) {
      if (typeof bufferTime.enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'bufferTime.enabled must be a boolean',
        });
      }
      if (![0, 5, 10, 15, 20, 30].includes(Number(bufferTime.duration))) {
        return res.status(400).json({
          success: false,
          message: 'Buffer duration must be 0, 5, 10, 15, 20, or 30 minutes',
        });
      }
      updates.bufferTime = {
        enabled: bufferTime.enabled,
        duration: Number(bufferTime.duration),
      };
    }

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Consultation duration and buffer rules updated successfully',
      data: {
        appointmentDuration: profile.appointmentDuration,
        bufferTime: profile.bufferTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List blocked time periods for authenticated doctor
// @route   GET /api/doctors/blocked-slots
// @access  Private (Doctor only)
const getBlockedSlots = async (req, res, next) => {
  try {
    const blockedSlots = await BlockedSlot.find({ doctorId: req.user._id }).sort({ startAt: 1 });
    res.json({
      success: true,
      count: blockedSlots.length,
      data: blockedSlots,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block specific time period
// @route   POST /api/doctors/blocked-slots
// @access  Private (Doctor only)
const createBlockedSlot = async (req, res, next) => {
  try {
    const { startAt, endAt, reason } = req.body;

    if (!startAt || !endAt || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startAt, endAt, and reason for blocking time',
      });
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Blocked period start time must be before end time',
      });
    }

    // Critical Rule: Do not allow blocking a period containing existing appointments without first resolving those appointments
    const conflictingAppointments = await Appointment.find({
      doctorId: req.user._id,
      status: 'CONFIRMED',
      startAt: { $lt: endDate },
      endAt: { $gt: startDate },
    }).populate('patientId', 'name email');

    if (conflictingAppointments.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot block this period: ${conflictingAppointments.length} confirmed appointment(s) already exist during this time. Please reschedule or cancel those appointments first.`,
        conflictingAppointments: conflictingAppointments.map((app) => ({
          id: app._id,
          patientName: app.patientId?.name,
          startAt: app.startAt,
          endAt: app.endAt,
        })),
      });
    }

    const blockedSlot = await BlockedSlot.create({
      doctorId: req.user._id,
      startAt: startDate,
      endAt: endDate,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Time period successfully blocked',
      data: blockedSlot,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete future blocked period
// @route   DELETE /api/doctors/blocked-slots/:id
// @access  Private (Doctor only)
const deleteBlockedSlot = async (req, res, next) => {
  try {
    const blockedSlot = await BlockedSlot.findOne({
      _id: req.params.id,
      doctorId: req.user._id,
    });

    if (!blockedSlot) {
      return res.status(404).json({
        success: false,
        message: 'Blocked slot not found or not owned by you',
      });
    }

    await BlockedSlot.deleteOne({ _id: blockedSlot._id });

    res.json({
      success: true,
      message: 'Blocked period removed. Availability restored for this time.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dynamically calculated availability for a doctor on a specific date
// @route   GET /api/doctors/:id/availability
// @access  Public
const getAvailability = async (req, res, next) => {
  try {
    const { date, timezone } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'date query parameter is required (format: YYYY-MM-DD)',
      });
    }

    const availability = await getDoctorAvailability(req.params.id, date, timezone);

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDoctors,
  getDoctorById,
  updateProfile,
  updateSchedule,
  updateAppointmentSettings,
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  getAvailability,
};
