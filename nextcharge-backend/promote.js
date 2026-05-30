require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const email = process.argv[2];
if (!email) {
  console.error("Please provide an email. Example: node promote.js email@example.com");
  process.exit(1);
}

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nextcharge';
    console.log(`Connecting to database...`);
    await mongoose.connect(mongoUri);
    
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { $set: { role: 'admin' } },
      { new: true }
    );
    
    if (!user) {
      console.log(`\n❌ User with email "${email}" was NOT found in the database.`);
      console.log(`👉 Make sure you have signed up/logged in on the website using this email first!`);
    } else {
      console.log(`\n✅ Success! Promoted "${email}" to admin role! 🎉`);
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
