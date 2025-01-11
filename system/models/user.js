const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  username: String, // Pastikan username ada di skema
  email: String,
  limit: Number,
  profile: String,
  apiKey: String,
  premium: Boolean,
  premiumTime: Number,
  defaultKey: String,
});

module.exports = mongoose.model('User', userSchema);
