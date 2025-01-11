const express = require('express');
const axios = require('axios');
const fetch = require('node-fetch');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const fileType = require('file-type');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const cheerio = require('cheerio');
const { request } = require('undici');
const User = require('./models/user'); // Assuming you have User model
const Function = require("./lib/function");
const Func = new Function();

const router = express.Router();

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Middleware to check API key and limits
const checkApiKey = async (req, res, next) => {
  const apiKey = req.query.apikey;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  try {
    const user = await User.findOne({ apiKey });
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Check if user is premium and within limit
    const currentDate = new Date();
    if (user.status === 'premium') {
      const premiumExpiry = new Date(user.premiumExpiry);
      if (currentDate > premiumExpiry) {
        user.status = 'free';
        await user.save();
      }
    }

    // Check usage limit
    const dailyLimit = user.status === 'premium' ? Infinity : user.limit;
    const currentUsage = user.usage || 0;

    if (currentUsage >= dailyLimit) {
      return res.status(429).json({ error: 'API usage limit exceeded' });
    }

    // Increment usage
    user.usage = currentUsage + 1;
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Route to upload files
router.post('/upload', checkApiKey, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.send(`File uploaded: ${req.file.path}`);
});

// Route to fetch data from an external API using axios
router.get('/external-data', checkApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://api.example.com/data');
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching external data' });
  }
});

// Route to fetch data using node-fetch
router.get('/fetch-data', checkApiKey, async (req, res) => {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data' });
  }
});

// Route to search YouTube using yt-search
router.get('/youtube-search', checkApiKey, async (req, res) => {
  try {
    const results = await ytSearch(req.query.query);
    res.json(results.videos);
  } catch (error) {
    res.status(500).json({ error: 'Error searching YouTube' });
  }
});

// Route to download YouTube video using ytdl-core
// Example API route for YouTube download with API key and limit check
router.get('/youtube-download', checkApiKey, async (req, res) => {
  const user = req.user;
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: 'URL is missing' });
  }

  const cost = 5; // Cost for this feature
  if (!user.premium && user.limit < cost) {
    return res.status(429).json({ error: 'API limit exceeded' });
  }
  if (!user.premium) {
    user.limit -= cost;
  }
  await user.save();

  // Implement your YouTube download logic here
  res.json({ message: `Successfully processed the URL: ${url}` });
});


// Route to scrape data using cheerio
router.get('/scrape', checkApiKey, async (req, res) => {
  try {
    const response = await axios.get('https://example.com');
    const $ = cheerio.load(response.data);
    const scrapedData = $('h1').text();
    res.json({ data: scrapedData });
  } catch (error) {
    res.status(500).json({ error: 'Error scraping data' });
  }
});

// Route to fetch data using undici
router.get('/undici-fetch', checkApiKey, async (req, res) => {
  try {
    const { body } = await request('https://api.example.com/data');
    const data = await body.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data' });
  }
});

router.get('/cekapikey', checkApiKey, async (req, res) => {
  const user = req.user;
  const apikey = req.query.apikey;
  const result = {
      usename: user.username,
      email: user.email,
      apikey: user.apiKey,
      limit: user.premium ? "Unlimited" : user.limit,
      premium: user.premium,
    };
  res.json(Func.resSukses(result));
});

module.exports = router;
