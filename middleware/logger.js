// middleware/logger.js - Request logging middleware
const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  console.log(`[${timestamp}] ${method} ${path}`);
  next();
};

module.exports = logger;
