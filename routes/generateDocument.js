// routes/generateDocument.js - On-demand document generation
const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
  return Promise.race([promise, timeout]);
};

router.post('/', async (req, res) => {
  const { document_type, business_profile = {} } = req.body;

  const {
    name = '',
    type = '',
    state = '',
    turnover = '',
    employees = '',
    description = ''
  } = business_profile;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are a legal document specialist for Indian MSMEs. Generate professional, accurate, ready-to-use documents.'
    });

    const prompt = `Generate a complete ${document_type} for:
Business: ${name}, Type: ${type}, State: ${state}
Turnover: ${turnover}, Employees: ${employees}
${description ? `Additional Info: ${description}` : ''}

Make it detailed, professional, and ready to use.
Include all necessary sections, proper formatting with line breaks, and specific details relevant to this business.
Minimum 300 words.
Return as plain text, not JSON.`;

    const result = await withTimeout(model.generateContent(prompt), 30000);

    if (result === undefined) {
      return res.status(504).json({
        success: false,
        error: 'Document generation timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    const content = result.response.text();

    // Generate a clean filename from document type
    const filename =
      document_type
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50) + '.txt';

    return res.json({
      success: true,
      document: {
        title: document_type,
        content,
        filename,
        generated_at: new Date().toISOString()
      }
    });

  } catch (err) {
    if (err.message === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'Document generation timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    console.error('[generate-document] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate document. Please try again.',
      details: err.message
    });
  }
});

module.exports = router;
