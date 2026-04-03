// server.js - MSME Sahay Agent Backend Entry Point
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const logger = require('./middleware/logger');
const rateLimiter = require('./middleware/rateLimiter');
const { validateAnalyze, validateChat, validateGenerateDocument, validateAnalyzeNotice } = require('./middleware/validate');

const healthRouter = require('./routes/health');
const analyzeRouter = require('./routes/analyze');
const chatRouter = require('./routes/chat');
const generateDocumentRouter = require('./routes/generateDocument');
const analyzeNoticeRouter = require('./routes/analyzeNotice');

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------------------------------------------
// Core Middleware
// -------------------------------------------------------
app.use(cors({ origin: '*' }));         // Allow ALL origins
app.use(express.json({ limit: '10mb' }));
app.use(logger);                         // Log every request
app.use(rateLimiter);                    // 20 req/min per IP

// -------------------------------------------------------
// Routes
// -------------------------------------------------------
app.get('/api/health', (req, res, next) => {
  req.url = '/';
  healthRouter(req, res, next);
});

app.post('/api/analyze', validateAnalyze, analyzeRouter);
app.post('/api/chat', validateChat, chatRouter);
app.post('/api/generate-document', validateGenerateDocument, generateDocumentRouter);
app.post('/api/analyze-notice', validateAnalyzeNotice, analyzeNoticeRouter);

// -------------------------------------------------------
// 404 Handler
// -------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found.',
    details: `${req.method} ${req.path} does not exist on this server.`,
    available_endpoints: [
      'GET  /api/health',
      'POST /api/analyze',
      'POST /api/chat',
      'POST /api/generate-document',
      'POST /api/analyze-notice'
    ]
  });
});

// -------------------------------------------------------
// Global Error Handler
// -------------------------------------------------------
app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'An unexpected server error occurred.',
    details: err.message
  });
});

// -------------------------------------------------------
// Start Server
// -------------------------------------------------------
app.listen(PORT, () => {
  console.log('============================================');
  console.log(`  MSME Sahay Agent Backend`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log('============================================');
  console.log('  Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  POST http://localhost:${PORT}/api/analyze`);
  console.log(`  POST http://localhost:${PORT}/api/chat`);
  console.log(`  POST http://localhost:${PORT}/api/generate-document`);
  console.log(`  POST http://localhost:${PORT}/api/analyze-notice`);
  console.log('============================================');
});

module.exports = app;
