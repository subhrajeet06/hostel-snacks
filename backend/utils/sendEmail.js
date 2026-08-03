const nodemailer = require('nodemailer');

/**
 * Sends transactional email via Brevo's free SMTP relay.
 *
 * Brevo's free tier (300 emails/day, no credit card, no domain
 * verification required to get started) is used here instead of a paid
 * provider. Required env vars:
 *   BREVO_SMTP_USER  - your Brevo account login email
 *   BREVO_SMTP_KEY   - the SMTP key from Brevo (Settings > SMTP & API),
 *                       NOT your account password
 *   FROM_EMAIL       - the "from" address shown to recipients
 *   FROM_NAME        - the "from" display name shown to recipients
 *
 * Lazily creates the transporter on first use so a missing/invalid SMTP
 * config fails when an email is actually sent, not at server boot.
 */
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    throw new Error('Email is not configured: BREVO_SMTP_USER and BREVO_SMTP_KEY must be set.');
  }

  transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_SMTP_PORT || 587),
    secure: false, // Brevo uses STARTTLS on port 587, not implicit TLS
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  return transporter;
};

const sendEmail = async (options) => {
  const info = await getTransporter().sendMail({
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  });

  // Never log recipient email content or credentials — only the
  // provider's message id, useful for support/debugging.
  console.log('Message sent: %s', info?.messageId);
};

module.exports = sendEmail;
