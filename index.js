const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github').Strategy; // Tambahkan ini
const crypto = require('crypto');
const nodeCron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const apiRoutes = require('./system/api');
const userRoutes = require('./system/routes/userRoutes');
const User = require('./system/models/user');
const { sendEmail } = require('./system/mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Mengatur koneksi MongoDB
mongoose.connect('ISI PAKAI DATABASE LU', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Konfigurasi Passport Google
passport.use(new GoogleStrategy({
    clientID: 'ISI PASSPORT GOOGLE LU',
    clientSecret: '',
    callbackURL: ''
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        const apiKey = `ATZX-${crypto.randomBytes(8).toString('hex')}`;
        user = new User({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          limit: 1000,
          profile: profile.photos[0].value,
          apiKey: apiKey,
          premium: false,
          premiumTime: 0,
          defaultKey: apiKey,
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Konfigurasi Passport GitHub
passport.use(new GitHubStrategy({
    clientID: 'your-github-client-id',      // Ganti dengan Client ID Anda
    clientSecret: 'your-github-client-secret',  // Ganti dengan Client Secret Anda
    callbackURL: 'https://elxyz-3ae8feadc789.herokuapp.com/auth/github/callback'
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        const apiKey = `ATZX-${crypto.randomBytes(8).toString('hex')}`;
        let email = '';
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
        }
        user = new User({
          githubId: profile.id,
          username: profile.username,
          email: email,
          limit: 1000,
          profile: profile.photos[0].value,
          apiKey: apiKey,
          premium: false,
          premiumTime: 0,
          defaultKey: apiKey,
        });
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Middleware untuk session
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

// Inisialisasi Passport
app.use(passport.initialize());
app.use(passport.session());

// Mengatur engine view menjadi EJS
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Route untuk auth dengan Google
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

// Route callback setelah autentikasi Google
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Redirect ke halaman setelah login berhasil
    res.redirect('/dashboard');
  });

// Route untuk auth dengan GitHub
app.get('/auth/github',
  passport.authenticate('github', { scope: ['user:email'] }));

// Route callback setelah autentikasi GitHub
app.get('/auth/github/callback', 
  passport.authenticate('github', { failureRedirect: '/' }),
  function(req, res) {
    // Redirect ke halaman setelah login berhasil
    res.redirect('/dashboard');
  });

// Middleware untuk memastikan pengguna telah login
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Route untuk dashboard
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
  const userCount = await User.countDocuments();
  res.render('dashboard', { user: req.user, userCount: userCount });
});

// Route untuk halaman profil
app.get('/profile', ensureAuthenticated, (req, res) => {
  res.render('profile', { user: req.user });
});

// Route untuk halaman utama
app.get('/', (req, res) => {
  res.render('index'); // Render template index.ejs
});

// Route untuk mendapatkan jumlah pengguna
app.get('/user-count', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.json({ count: userCount });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user count' });
  }
});

// Middleware untuk mengecek API key dan limit
async function checkApiKey(req, res, next) {
  const apiKey = req.query.apikey;
  if (!apiKey) {
    return res.status(401).json({ error: 'API key is missing' });
  }
  const user = await User.findOne({ apiKey: apiKey });
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (user.premium && user.premiumTime < now) {
    user.premium = false;
    user.premiumTime = 0;
    user.limit = 1000; // Reset to default free limit
    await user.save();
  }
  if (!user.premium && user.limit <= 0) {
    return res.status(429).json({ error: 'API limit exceeded' });
  }
  req.user = user;
  next();
}

// Example API route with API key and limit check
app.get('/api/some-feature', checkApiKey, async (req, res) => {
  const user = req.user;
  const cost = 5; // Cost for this feature
  if (!user.premium && user.limit < cost) {
    return res.status(429).json({ error: 'API limit exceeded' });
  }
  if (!user.premium) {
    user.limit -= cost;
  }
  await user.save();
  res.json({ message: 'Feature accessed successfully' });
});

// Reset limits setiap jam 00:00
nodeCron.schedule('0 0 * * *', async () => {
  const freeLimit = 1000; // Default limit for free users
  const users = await User.find();
  const now = Math.floor(Date.now() / 1000);

  for (const user of users) {
    if (user.premium && user.premiumTime < now) {
      user.premium = false;
      user.limit = freeLimit;

      // Send email notification
      const subject = 'Your Premium Subscription has Expired';
      const text = `Hello ${user.username},\n\nYour premium subscription has expired. Your account has been downgraded to the free plan with a limit of ${freeLimit} API calls per day.\n\nBest regards,\nYour Company Name`;

      try {
        await sendEmail(user.email, subject, text);
        console.log(`Email sent to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    } else if (!user.premium) {
      user.limit = freeLimit;
    }
    await user.save();
  }
  console.log('API limits reset and emails sent');
});

// Use the API routes
app.use('/', apiRoutes);
app.use('/user', userRoutes);

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});
