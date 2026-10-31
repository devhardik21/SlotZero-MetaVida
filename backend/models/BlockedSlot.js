const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema(
  {
    doctorId: {
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
    reason: {
      type: String,
      required: [true, 'Please provide a reason for blocking time'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

blockedSlotSchema.index({ doctorId: 1, startAt: 1 });

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema);
