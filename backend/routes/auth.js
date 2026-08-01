const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { logSecurityEvent } = require('../utils/securityLogger');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidators');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @route   POST /api/auth/register
// @desc    Register a new customer
// @access  Public
router.post('/register', registerLimiter, registerValidator, async (req, res) => {
  const { name, email, password, phone, roomNumber } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }

  const user = await User.create({ name, email: normalizedEmail, password, phone, roomNumber, role: 'customer' });

  logSecurityEvent('user_registered', { userId: user._id.toString() });

  res.status(201).json({
    success: true,
    message: 'Registered successfully',
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, roomNumber: user.roomNumber },
  });
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginLimiter, loginValidator, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('name email password role phone roomNumber isActive');
  if (!user || !(await user.matchPassword(password))) {
    logSecurityEvent('login_failed', { email: normalizedEmail, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    logSecurityEvent('login_failed', { email: normalizedEmail, ip: req.ip, reason: 'account_deactivated' });
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
  }

  logSecurityEvent('login_succeeded', { userId: user._id.toString(), ip: req.ip });

  res.json({
    success: true,
    message: 'Login successful',
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, roomNumber: user.roomNumber },
  });
});

// @route   GET /api/auth/me
// @desc    Get logged in user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, user: req.user });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, updateProfileValidator, async (req, res) => {
  const { name, phone, roomNumber } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone, roomNumber },
    { new: true, runValidators: true }
  ).select('-password');

  res.json({ success: true, user });
});

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, changePasswordValidator, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);

  if (!(await user.matchPassword(currentPassword))) {
    logSecurityEvent('password_change_failed', { userId: req.user.id, reason: 'incorrect_current_password' });
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();

  logSecurityEvent('password_change_succeeded', { userId: req.user.id });

  res.json({ success: true, message: 'Password changed successfully' });
});

// @route   POST /api/auth/forgot-password
// @desc    Forgot password
// @access  Public
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidator, async (req, res) => {
  const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Always respond with the same generic success message whether or not the
  // account exists, so this endpoint cannot be used to enumerate which
  // emails are registered. The frontend already only checks `success`
  // (see ForgotPasswordPage.jsx), so this does not change its behavior for
  // legitimate users.
  const genericResponse = { success: true, message: 'If that email is registered, a reset link has been sent.' };

  if (!user) {
    logSecurityEvent('password_reset_requested', { email: normalizedEmail, found: false });
    return res.status(200).json(genericResponse);
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;
  const html = `
    <h1>You have requested a password reset</h1>
    <p>Please click on the following link to reset your password:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Token - HostelBite',
      message,
      html
    });

    logSecurityEvent('password_reset_requested', { userId: user._id.toString(), found: true });
    res.status(200).json(genericResponse);
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    // Still respond generically — do not reveal whether the failure was
    // due to the email not existing or an email-provider error.
    res.status(200).json(genericResponse);
  }
});

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.put('/reset-password/:token', resetPasswordLimiter, resetPasswordValidator, async (req, res) => {
  // Get hashed token
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    logSecurityEvent('password_reset_failed', { ip: req.ip, reason: 'invalid_or_expired_token' });
    return res.status(400).json({ success: false, message: 'Invalid token' });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  logSecurityEvent('password_reset_succeeded', { userId: user._id.toString() });

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token: generateToken(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, roomNumber: user.roomNumber },
  });
});

module.exports = router;
