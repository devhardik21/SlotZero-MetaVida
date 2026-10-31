const mongoose = require('mongoose');

const SUPPORTED_TIMEZONES = ['Asia/Kolkata', 'Europe/London', 'America/New_York'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['DOCTOR', 'PATIENT'],
        message: 'Role must be either DOCTOR or PATIENT',
      },
      required: [true, 'Please specify user role'],
    },
    timezone: {
      type: String,
      enum: {
        values: SUPPORTED_TIMEZONES,
        message: '{VALUE} is not a supported timezone. Supported: Asia/Kolkata, Europe/London, America/New_York',
      },
      required: [true, 'Please specify timezone'],
      default: 'Europe/London',
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model('User', userSchema);
