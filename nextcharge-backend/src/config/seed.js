require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Station = require('../models/Station');
const logger = require('../utils/logger');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nextcharge');
  logger.info('Connected to DB for seeding...');

  // Clean up
  await Promise.all([User.deleteMany({}), Station.deleteMany({})]);

  // ─── Create Users ─────────────────────────────────────────────────────────
  const admin = await User.create({
    name: 'Arjun Sharma',
    email: 'admin@nextcharge.in',
    phone: '9876543210',
    password: 'Admin@1234',
    role: 'admin',
    isPhoneVerified: true,
    isEmailVerified: true
  });

  const operator = await User.create({
    name: 'Priya Patel',
    email: 'operator@nextcharge.in',
    phone: '9876543211',
    password: 'Operator@1234',
    role: 'operator',
    isPhoneVerified: true
  });

  const user1 = await User.create({
    name: 'Rahul Mehta',
    email: 'rahul@example.com',
    phone: '9876543212',
    password: 'User@1234',
    role: 'user',
    isPhoneVerified: true,
    vehicles: [{
      make: 'Tata', model: 'Nexon EV Max', year: 2023,
      connectorType: 'CCS2', batteryCapacity: 40.5,
      licensePlate: 'MH01AB1234', isPrimary: true
    }]
  });

  logger.info('✅ Seed complete!');
  logger.info(`   Admin:    admin@nextcharge.in    / Admin@1234`);
  logger.info(`   Operator: operator@nextcharge.in / Operator@1234`);
  logger.info(`   User:     rahul@example.com      / User@1234`);
  logger.info(`   Stations: 0 created`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  logger.error('Seed failed:', err);
  process.exit(1);
});
