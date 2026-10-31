const mongoose = require('mongoose');

const slotLockSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Critical Hackathon Requirement: Unique compound index preventing concurrent overlapping bookings
slotLockSchema.index({ doctorId: 1, startAt: 1 }, { unique: true });
slotLockSchema.index({ appointmentId: 1 });

module.exports = mongoose.model('SlotLock', slotLockSchema);
