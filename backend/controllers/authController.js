const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'slotzero_jwt_secret_dev_key_secure_2026',
    { expiresIn: '7d' }
  );
};

// @desc    Register a new user (Doctor or Patient)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, timezone, specialization, experience, consultationFee, bio } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role (DOCTOR or PATIENT)',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      timezone: timezone || 'Europe/London',
    });

    // If registering as a doctor, automatically initialize DoctorProfile
    if (role === 'DOCTOR') {
      const defaultWorkingHours = [
        { day: 'Monday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        { day: 'Tuesday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        { day: 'Wednesday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        { day: 'Thursday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        { day: 'Friday', enabled: true, intervals: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }] },
        { day: 'Saturday', enabled: false, intervals: [] },
        { day: 'Sunday', enabled: false, intervals: [] },
      ];

      await DoctorProfile.create({
        userId: user._id,
        specialization: specialization || 'General Physician',
        experience: experience || 5,
        consultationFee: consultationFee || 100,
        bio: bio || 'Board-certified medical practitioner.',
        appointmentDuration: 30,
        bufferTime: { enabled: true, duration: 15 },
        workingHours: defaultWorkingHours,
        timezone: user.timezone,
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials',
      });
    }

    const token = generateToken(user);

    let doctorProfile = null;
    if (user.role === 'DOCTOR') {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
        doctorProfile: doctorProfile || undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    let doctorProfile = null;

    if (user.role === 'DOCTOR') {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone,
        doctorProfile: doctorProfile || undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
};
