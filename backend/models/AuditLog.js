const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['BOOKED', 'CANCELLED', 'RESCHEDULED'],
      required: true,
    },
    previousStartAt: {
      type: Date,
      default: null,
    },
    newStartAt: {
      type: Date,
      default: null,
    },
    details: {
      type: String,
      default: '',
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

auditLogSchema.index({ appointmentId: 1, performedAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
