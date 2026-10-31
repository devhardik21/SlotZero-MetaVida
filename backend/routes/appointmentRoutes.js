const express = require('express');
const router = express.Router();
const {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  getAppointmentHistory,
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

// Patient routes
router.post('/', protect, authorize('PATIENT'), createAppointment);
router.get('/my', protect, authorize('PATIENT'), getMyAppointments);

// Doctor routes
router.get('/doctor', protect, authorize('DOCTOR'), getDoctorAppointments);

// Shared owner routes (Doctor or Patient)
router.get('/:id/history', protect, getAppointmentHistory);
router.get('/:id', protect, getAppointmentById);
router.patch('/:id/cancel', protect, cancelAppointment);
router.patch('/:id/reschedule', protect, rescheduleAppointment);

module.exports = router;
