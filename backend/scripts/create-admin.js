require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

// No hardcoded fallback credentials — this script requires ADMIN_EMAIL and
// ADMIN_PASSWORD to be set explicitly (e.g. in backend/.env) so real
// credentials are never committed to source control or logged.
if (!email || !password) {
  console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD must be set in your environment before running this script.');
  process.exit(1);
}

const createAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ email });

    if (admin) {
      admin.role = 'admin';
      admin.password = password; // Will be hashed by pre-save hook
      await admin.save();
      console.log(`✅ Updated existing user ${email} to admin.`);
    } else {
      admin = await User.create({
        name: 'Admin',
        email,
        password,
        role: 'admin',
      });
      console.log(`✅ Created new admin: ${email}`);
    }

    // Never log the password, even in a one-off admin script.
    console.log(`\nYou can now log in with the email/password from your environment (${email}).\n`);

  } catch (err) {
    console.error('Error creating admin:', err.message);
  } finally {
    process.exit(0);
  }
};

createAdmin();
