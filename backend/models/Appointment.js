const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'CANCELLED', 'COMPLETED'],
      default: 'CONFIRMED',
      index: true,
    },
    doctorTimezone: {
      type: String,
      required: true,
    },
    patientTimezone: {
      type: String,
      required: true,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    reason: {
      type: String,
      trim: true,
      default: 'General Consultation',
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ doctorId: 1, startAt: 1 });
appointmentSchema.index({ patientId: 1, startAt: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
