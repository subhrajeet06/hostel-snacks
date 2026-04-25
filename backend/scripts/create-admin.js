require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI;
const email = process.env.ADMIN_EMAIL || 'subhrajeet2006@gmail.com';
const password = process.env.ADMIN_PASSWORD || 'Subhra@2006';

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

    console.log(`\nYou can now log in with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);
    
  } catch (err) {
    console.error('Error creating admin:', err.message);
  } finally {
    process.exit(0);
  }
};

createAdmin();
