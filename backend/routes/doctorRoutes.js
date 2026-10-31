const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  updateProfile,
  updateSchedule,
  updateAppointmentSettings,
  getBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  getAvailability,
} = require('../controllers/doctorController');
const { protect, authorize } = require('../middleware/auth');

// Doctor blocked periods (MUST BE BEFORE /:id)
router.get('/blocked-slots', protect, authorize('DOCTOR'), getBlockedSlots);
router.post('/blocked-slots', protect, authorize('DOCTOR'), createBlockedSlot);
router.delete('/blocked-slots/:id', protect, authorize('DOCTOR'), deleteBlockedSlot);

// Doctor protected routes
router.put('/profile', protect, authorize('DOCTOR'), updateProfile);
router.put('/schedule', protect, authorize('DOCTOR'), updateSchedule);
router.put('/appointment-settings', protect, authorize('DOCTOR'), updateAppointmentSettings);

// Public doctor discovery and availability
router.get('/', getDoctors);
router.get('/:id/availability', getAvailability);
router.get('/:id', getDoctorById);

module.exports = router;
