// middleware/validate.js - Input validation helpers

const validateAnalyze = (req, res, next) => {
  const required = ['business_name', 'business_type', 'state', 'turnover', 'employees'];
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      success: false,
      error: 'Request body is missing or invalid.',
      details: 'Expected a JSON object with business details.'
    });
  }

  const missing = required.filter(field => !body[field] || String(body[field]).trim() === '');
  if (missing.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required fields: ${missing.join(', ')}`,
      details: 'Please provide all required business information.'
    });
  }

  next();
};

const validateChat = (req, res, next) => {
  const { question, business_context } = req.body || {};

  if (!question || String(question).trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: question',
      details: 'Please provide a question to ask.'
    });
  }

  if (!business_context || !business_context.name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: business_context',
      details: 'Please provide business_context with at least a name field.'
    });
  }

  next();
};

const validateGenerateDocument = (req, res, next) => {
  const { document_type, business_profile } = req.body || {};

  if (!document_type || String(document_type).trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: document_type',
      details: 'Please specify what type of document to generate.'
    });
  }

  if (!business_profile || !business_profile.name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: business_profile',
      details: 'Please provide business_profile with at least a name field.'
    });
  }

  next();
};

const validateAnalyzeNotice = (req, res, next) => {
  const { notice_text, business_profile } = req.body || {};

  if (!notice_text || String(notice_text).trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: notice_text',
      details: 'Please provide the text of the government notice.'
    });
  }

  if (!business_profile || !business_profile.name) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: business_profile',
      details: 'Please provide business_profile with at least a name field.'
    });
  }

  next();
};

module.exports = {
  validateAnalyze,
  validateChat,
  validateGenerateDocument,
  validateAnalyzeNotice
};
