// File: middleware/rateLimitByIP.js
const { RateLimiterMemory } = require('rate-limiter-flexible');

const rateLimiter = new RateLimiterMemory({
  points: 20,              // 20 requests
  duration: 24 * 60 * 60,  // per 24 hours
});

async function rateLimitByIP(req, res, next) {
  try {
    await rateLimiter.consume(req.ip); // consume 1 point
    next();
  } catch (rejRes) {
    res.status(429).json({
      error: 'Daily message limit reached. Try again tomorrow.',
      retryAfter: new Date(Date.now() + rejRes.msBeforeNext).toISOString(),
    });
  }
}

module.exports = { rateLimitByIP };
