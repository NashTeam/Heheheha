const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/user');
const { sendEmail } = require('../mailer');
const ensureAuthenticated = require('./ensureAuthenticated');

// Route to change API key (only for premium users)
router.post('/changeapikey', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  if (!user.premium) {
    return res.status(403).json({ error: 'Only premium users can change their API key' });
  }

  user.apiKey = `ATZX-${crypto.randomBytes(8).toString('hex')}`;
  await user.save();

  // Send email notification
  const subject = 'Your API Key has been Changed';
  const text = `Hello ${user.username},\n\nYour API key has been changed successfully. Your new API key is: ${user.apiKey}\n\nBest regards,\nNashTeam`;

  try {
    await sendEmail(user.email, subject, text);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${user.email}:`, error);
  }

  res.json({ message: 'API key changed successfully', apiKey: user.apiKey });
});

// Route to check API key status
router.get('/cekapikey', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  const apikey = req.query.apikey;
  res.json({
    apiKey: user.apiKey,
    premium: user.premium,
    limit: user.limit
  });
});

// Route to update user profile
router.post('/profile', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  const { username, profile, apikey } = req.body;

  if (username) {
    user.username = username;
  }
  if (profile) {
    user.profile = profile;
  }
  if (apikey) {
    user.apiKey = apikey;
  }

  await user.save();
  
  res.json({ message: 'Profile updated successfully' });
});

// Route to upgrade to premium
router.post('/upgrade', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  const { premiumDuration } = req.body; // Duration in seconds

  user.premium = true;
  user.premiumTime = Math.floor(Date.now() / 1000) + premiumDuration; // Set premium expiry time
  
  await user.save();

  // Send email notification
  const subject = 'Your Premium Subscription has Started';
  const text = `Hello ${user.username},\n\nYour premium subscription is now active for the next ${premiumDuration} seconds.\n\nBest regards,\nNashTeam`;

  try {
    await sendEmail(user.email, subject, text);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error(`Failed to send email to ${user.email}:`, error);
  }

  res.json({ message: 'User upgraded to premium successfully', premiumTime: user.premiumTime });
});

// Route untuk mengganti data pengguna
router.post('/update', ensureAuthenticated, async (req, res) => {
  const user = req.user;
  const { username, profile, apiKey } = req.body; // Dapatkan data yang dikirim oleh pengguna

  // Periksa apakah data yang diberikan oleh pengguna tidak kosong, jika tidak kosong, lakukan pembaruan
  if (username) {
    user.username = username;
  }
  if (profile) {
    user.profile = profile;
  }
  if (apiKey) {
    user.apiKey = apiKey;
  }

  // Simpan perubahan ke database
  try {
    await user.save();
    res.json({ message: 'User data updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user data' });
  }
});


module.exports = router;
