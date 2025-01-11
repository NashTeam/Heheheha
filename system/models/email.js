const nodeCron = require('node-cron');
const User = require('./user');
const { sendEmail } = require('../mailer');

// Reset limits setiap jam 00:00
nodeCron.schedule('0 0 * * *', async () => {
  const freeLimit = 1000; // Default limit for free users
  const users = await User.find();
  const now = new Date();

  for (const user of users) {
    if (user.status === 'premium' && user.premiumExpiry && user.premiumExpiry < now) {
      user.status = 'free';
      user.limit = freeLimit;
      user.premiumExpiry = null;

      // Send email notification
      const subject = 'Your Premium Subscription has Expired';
      const text = `Hello ${user.displayName},\n\nYour premium subscription has expired. Your account has been downgraded to the free plan with a limit of ${freeLimit} API calls per day.\n\nBest regards,\nYour Company Name`;

      try {
        await sendEmail(user.email, subject, text);
        console.log(`Email sent to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    } else if (user.status === 'free') {
      user.limit = freeLimit;
    }
    await user.save();
  }
  console.log('API limits reset and emails sent');
});
