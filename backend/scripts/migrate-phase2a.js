/**
 * Phase 2A Migration Script
 *
 * Grandfathers existing users by setting isEmailVerified=true and
 * tokenVersion=0 for all users that don't have these fields yet.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage: node scripts/migrate-phase2a.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set.');
  process.exit(1);
}

const migrate = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Grandfather existing users — mark them as verified so they aren't
    // locked out by the new email-verification requirement.
    const verifyResult = await User.updateMany(
      { isEmailVerified: { $exists: false } },
      { $set: { isEmailVerified: true } }
    );
    console.log(`✅ Set isEmailVerified=true for ${verifyResult.modifiedCount} existing users.`);

    // Ensure all users have a tokenVersion field.
    const tokenResult = await User.updateMany(
      { tokenVersion: { $exists: false } },
      { $set: { tokenVersion: 0 } }
    );
    console.log(`✅ Set tokenVersion=0 for ${tokenResult.modifiedCount} existing users.`);

    console.log('\n🎉 Phase 2A migration completed successfully.\n');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrate();
