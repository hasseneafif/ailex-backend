// File: middleware/rateLimitByIP.js
const ipMessageCounts = new Map();
const DAILY_LIMIT = 10;

function rateLimitByIP(req, res, next) {
  const ip = req.ip;
  const count = ipMessageCounts.get(ip) || 0;
  if (count >= DAILY_LIMIT) {
    return res.status(429).json({ error: 'Daily message limit reached. Try again tomorrow.' });
  }
  ipMessageCounts.set(ip, count + 1);
  next();
}

// Daily reset
setInterval(() => {
  ipMessageCounts.clear();
}, 24 * 60 * 60 * 1000);

module.exports = { rateLimitByIP };
