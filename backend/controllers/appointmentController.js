const Appointment = require('../models/Appointment');
const AuditLog = require('../models/AuditLog');
const {
  createAppointmentAtomic,
  cancelAppointmentAtomic,
  rescheduleAppointmentAtomic,
} = require('../services/bookingService');

// @desc    Book a new appointment atomically with slot locks
// @route   POST /api/appointments
// @access  Private (Patient only)
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, startAt, endAt, patientTimezone, reason, idempotencyKey } = req.body;

    if (!doctorId || !startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: 'doctorId, startAt, and endAt are required to book an appointment',
      });
    }

    const { appointment, isDuplicate } = await createAppointmentAtomic({
      doctorId,
      patientId: req.user._id,
      startAt,
      endAt,
      patientTimezone: patientTimezone || req.user.timezone || 'Asia/Kolkata',
      reason,
      idempotencyKey,
    });

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      message: isDuplicate
        ? 'Existing appointment retrieved (idempotent request)'
        : 'Appointment confirmed and slot locked successfully',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in patient's appointments
// @route   GET /api/appointments/my
// @access  Private (Patient only)
const getMyAppointments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { patientId: req.user._id };

    if (status) {
      filter.status = status.toUpperCase();
    }

    const appointments = await Appointment.find(filter)
      .populate('doctorId', 'name email timezone')
      .sort({ startAt: -1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor's appointments (filter by date and status)
// @route   GET /api/appointments/doctor
// @access  Private (Doctor only)
const getDoctorAppointments = async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const filter = { doctorId: req.user._id };

    if (status && status !== 'ALL') {
      filter.status = status.toUpperCase();
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      filter.startAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email timezone')
      .sort({ startAt: 1 });

    res.json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment details
// @route   GET /api/appointments/:id
// @access  Private (Doctor or Patient)
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctorId', 'name email timezone')
      .populate('patientId', 'name email timezone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isDoctor = appointment.doctorId._id.toString() === req.user._id.toString();
    const isPatient = appointment.patientId._id.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this appointment',
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel an appointment
// @route   PATCH /api/appointments/:id/cancel
// @access  Private (Patient or Doctor owner)
const cancelAppointment = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const appointment = await cancelAppointmentAtomic({
      appointmentId: req.params.id,
      userId: req.user._id,
      userRole: req.user.role,
      reason,
    });

    res.json({
      success: true,
      message: 'Appointment successfully cancelled and slot locks released',
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule an appointment
// @route   PATCH /api/appointments/:id/reschedule
// @access  Private (Patient or Doctor owner)
const rescheduleAppointment = async (req, res, next) => {
  try {
    const { newStartAt, newEndAt, reason } = req.body;

    if (!newStartAt || !newEndAt) {
      return res.status(400).json({
        success: false,
        message: 'newStartAt and newEndAt timestamps are required to reschedule',
      });
    }

    const updatedApp = await rescheduleAppointmentAtomic({
      appointmentId: req.params.id,
      userId: req.user._id,
      newStartAt,
      newEndAt,
      reason,
    });

    res.json({
      success: true,
      message: 'Appointment successfully rescheduled with new slot locks acquired',
      data: updatedApp,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit trail history of an appointment
// @route   GET /api/appointments/:id/history
// @access  Private (Doctor or Patient of appointment)
const getAppointmentHistory = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view audit history for this appointment',
      });
    }

    const history = await AuditLog.find({ appointmentId: req.params.id })
      .populate('performedBy', 'name email role')
      .sort({ performedAt: -1 });

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentHistory,
};
