require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');

const MONGO_URI = process.env.MONGO_URI;

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});

  // Create Admin
  const admin = await User.create({
    name: 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@hostel.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
  });
  console.log('✅ Admin created:', admin.email);

  // Create Seller
  const seller = await User.create({
    name: 'Raju Snacks',
    email: 'seller@hostel.com',
    password: 'Seller@123',
    role: 'seller',
    phone: '9876543210',
  });
  console.log('✅ Seller created:', seller.email);

  // Create sample customer
  await User.create({
    name: 'Test Student',
    email: 'student@hostel.com',
    password: 'Student@123',
    role: 'customer',
    phone: '9876543211',
    roomNumber: 'A-201',
  });
  console.log('✅ Customer created: student@hostel.com');

  // Create products
  const products = [
    { name: 'Lays Classic Salted', price: 20, category: 'chips', stock: 50, image: 'https://via.placeholder.com/200x200?text=Lays', description: 'Crispy potato chips', salesCount: 120, discount: 0 },
    { name: 'Kurkure Masala Munch', price: 20, category: 'kurkure', stock: 40, image: 'https://via.placeholder.com/200x200?text=Kurkure', description: 'Crunchy corn snack', salesCount: 200, discount: 5 },
    { name: 'Parle-G Biscuits', price: 10, category: 'biscuits', stock: 100, image: 'https://via.placeholder.com/200x200?text=ParleG', description: 'Classic glucose biscuits', salesCount: 300, discount: 0 },
    { name: 'Hide & Seek', price: 30, category: 'biscuits', stock: 60, image: 'https://via.placeholder.com/200x200?text=HideSeek', description: 'Chocolate chip cookies', salesCount: 80, discount: 0 },
    { name: 'Dairy Milk Chocolate', price: 40, category: 'chocolates', stock: 45, image: 'https://via.placeholder.com/200x200?text=DairyMilk', description: 'Creamy milk chocolate', salesCount: 90, discount: 10 },
    { name: 'Maggi Noodles', price: 14, category: 'noodles', stock: 80, image: 'https://via.placeholder.com/200x200?text=Maggi', description: '2-minute instant noodles', salesCount: 250, discount: 0 },
    { name: 'Kurkure Chilli Chatka', price: 20, category: 'kurkure', stock: 35, image: 'https://via.placeholder.com/200x200?text=KurkureChilli', description: 'Spicy kurkure snack', salesCount: 75, discount: 0 },
    { name: 'Oreo Biscuits', price: 30, category: 'biscuits', stock: 55, image: 'https://via.placeholder.com/200x200?text=Oreo', description: 'Classic cream biscuits', salesCount: 130, discount: 0 },
    { name: 'Lay\'s Magic Masala', price: 20, category: 'chips', stock: 45, image: 'https://via.placeholder.com/200x200?text=LaysMasala', description: 'Spicy masala flavoured chips', salesCount: 180, discount: 0 },
    { name: 'Yippee Noodles', price: 14, category: 'noodles', stock: 60, image: 'https://via.placeholder.com/200x200?text=Yippee', description: 'Magic masala noodles', salesCount: 95, discount: 0 },
    { name: '5 Star Chocolate', price: 20, category: 'chocolates', stock: 50, image: 'https://via.placeholder.com/200x200?text=5Star', description: 'Caramel filled chocolate bar', salesCount: 110, discount: 5 },
    { name: 'Kurkure Puffcorn', price: 20, category: 'kurkure', stock: 40, image: 'https://via.placeholder.com/200x200?text=Puffcorn', description: 'Light and crispy puffcorn', salesCount: 60, discount: 0 },
  ];

  for (const p of products) {
    await Product.create({ ...p, seller: seller._id });
  }
  console.log('✅ Products created:', products.length);

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Login credentials:');
  console.log('  Admin:    admin@hostel.com   / Admin@123');
  console.log('  Seller:   seller@hostel.com  / Seller@123');
  console.log('  Customer: student@hostel.com / Student@123');

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
