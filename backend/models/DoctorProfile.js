const mongoose = require('mongoose');

const SUPPORTED_TIMEZONES = ['Asia/Kolkata', 'Europe/London', 'America/New_York'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const workingIntervalSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:mm (24hr)'],
    },
    end: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:mm (24hr)'],
    },
  },
  { _id: false }
);

const dailyScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: DAYS_OF_WEEK,
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    intervals: [workingIntervalSchema],
  },
  { _id: false }
);

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please provide specialization'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Please provide years of experience'],
      min: [0, 'Experience cannot be negative'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Please provide consultation fee'],
      min: [0, 'Consultation fee cannot be negative'],
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    appointmentDuration: {
      type: Number,
      enum: {
        values: [15, 30, 60],
        message: 'Appointment duration must be 15, 30, or 60 minutes',
      },
      default: 30,
    },
    bufferTime: {
      enabled: {
        type: Boolean,
        default: true,
      },
      duration: {
        type: Number,
        enum: {
          values: [0, 5, 10, 15, 20, 30],
          message: 'Buffer duration must be 0, 5, 10, 15, 20, or 30 minutes',
        },
        default: 15,
      },
    },
    workingHours: [dailyScheduleSchema],
    timezone: {
      type: String,
      enum: {
        values: SUPPORTED_TIMEZONES,
        message: '{VALUE} is not a supported timezone',
      },
      required: true,
      default: 'Europe/London',
    },
  },
  {
    timestamps: true,
  }
);

doctorProfileSchema.index({ specialization: 1 });

module.exports = mongoose.model('DoctorProfile', doctorProfileSchema);
