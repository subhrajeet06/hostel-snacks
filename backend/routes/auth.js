const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { logSecurityEvent } = require('../utils/securityLogger');
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  resendVerificationLimiter,
} = require('../middleware/rateLimiter');
const {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
} = require('../validators/authValidators');

// Generate JWT Token — includes tokenVersion so the token is automatically
// invalidated when the user changes/resets their password.
const generateToken = (id, tokenVersion = 0) => {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ─── Helper: send verification email ───────────────────────────────────────
const sendVerificationEmail = async (user, req) => {
  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

  const html = `
    <h1>Verify your email address</h1>
    <p>Hi ${user.name},</p>
    <p>Thanks for creating a HostelBite account! Please verify your email by clicking the link below:</p>
    <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create this account, you can safely ignore this email.</p>
  `;

  await sendEmail({
    email: user.email,
    subject: 'Verify your email — HostelBite',
    message: `Please verify your email by visiting: ${verifyUrl}`,
    html,
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

  // Send verification email — don't auto-login until verified.
  try {
    await sendVerificationEmail(user, req);
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
    // Account is created but email failed. User can resend later.
  }

  res.status(201).json({
    success: true,
    message: 'Account created! Please check your email to verify your account.',
    requiresVerification: true,
  });
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginLimiter, loginValidator, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('name email password role phone roomNumber isActive isEmailVerified tokenVersion');
  if (!user || !(await user.matchPassword(password))) {
    logSecurityEvent('login_failed', { email: normalizedEmail, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    logSecurityEvent('login_failed', { email: normalizedEmail, ip: req.ip, reason: 'account_deactivated' });
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact admin.' });
  }

  // Block login for unverified accounts, with option to resend
  if (!user.isEmailVerified) {
    logSecurityEvent('login_failed', { email: normalizedEmail, ip: req.ip, reason: 'email_not_verified' });
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before logging in.',
      requiresVerification: true,
    });
  }

  logSecurityEvent('login_succeeded', { userId: user._id.toString(), ip: req.ip });

  res.json({
    success: true,
    message: 'Login successful',
    token: generateToken(user._id, user.tokenVersion),
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, roomNumber: user.roomNumber },
  });
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  logSecurityEvent('email_verified', { userId: user._id.toString() });

  res.status(200).json({
    success: true,
    message: 'Email verified successfully! You can now log in.',
  });
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public (rate-limited)
router.post('/resend-verification', resendVerificationLimiter, resendVerificationValidator, async (req, res) => {
  const normalizedEmail = String(req.body.email || '').trim().toLowerCase();

  // Generic response to prevent email enumeration
  const genericResponse = { success: true, message: 'If that email is registered and unverified, a new verification link has been sent.' };

  const user = await User.findOne({ email: normalizedEmail });

  if (!user || user.isEmailVerified) {
    return res.status(200).json(genericResponse);
  }

  try {
    await sendVerificationEmail(user, req);
    logSecurityEvent('verification_email_resent', { userId: user._id.toString() });
  } catch (err) {
    console.error('Failed to resend verification email:', err.message);
  }

  res.status(200).json(genericResponse);
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
  // Bump tokenVersion to invalidate all existing sessions (other devices).
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  logSecurityEvent('password_change_succeeded', { userId: req.user.id });

  // Issue a fresh token with the new tokenVersion so the current session stays alive.
  res.json({
    success: true,
    message: 'Password changed successfully',
    token: generateToken(user._id, user.tokenVersion),
  });
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
  // Bump tokenVersion to invalidate all previous sessions.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  logSecurityEvent('password_reset_succeeded', { userId: user._id.toString() });

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token: generateToken(user._id, user.tokenVersion),
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, roomNumber: user.roomNumber },
  });
});

module.exports = router;
