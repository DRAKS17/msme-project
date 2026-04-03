// middleware/rateLimiter.js - Rate limiting middleware
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 20,             // max 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please wait a minute before trying again.',
    details: 'Rate limit: 20 requests per minute per IP address.'
  }
});

module.exports = limiter;
