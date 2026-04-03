// routes/analyzeNotice.js - Government notice analysis
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
  const { notice_text, business_profile = {} } = req.body;

  const {
    name: bizName = 'this business',
    type: bizType = 'business',
    state: bizState = 'India'
  } = business_profile;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are an expert at reading and explaining Indian government notices to small business owners. Always be calm, clear, and helpful. Return JSON only. No markdown. No backticks. No explanation outside JSON.'
    });

    const prompt = `Analyze this government notice received by ${bizName} which is a ${bizType} in ${bizState}:

NOTICE TEXT:
${notice_text}

Return this JSON:
{
  "notice_type": "type of notice",
  "issuing_authority": "who sent it",
  "seriousness_level": number 1 to 10,
  "seriousness_label": "Not Serious or Moderate or Serious or Very Serious or Critical",
  "plain_explanation": "explain in simple language what this notice means",
  "required_actions": [
    "action 1",
    "action 2"
  ],
  "deadline": "deadline mentioned or estimate",
  "consequence_if_ignored": "what happens",
  "response_letter": "complete draft response letter ready to send",
  "next_steps": ["step 1", "step 2", "step 3"]
}`;

    const result = await withTimeout(model.generateContent(prompt), 30000);

    if (result === undefined) {
      return res.status(504).json({
        success: false,
        error: 'Notice analysis timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    const rawText = result.response
      .text()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    let analysis;
    try {
      analysis = JSON.parse(rawText);
    } catch {
      // Retry fix
      const fixModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const fixResult = await fixModel.generateContent(
        `Fix this JSON and return only valid JSON, nothing else:\n\n${rawText}`
      );
      const fixedText = fixResult.response
        .text()
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      analysis = JSON.parse(fixedText);
    }

    return res.json({
      success: true,
      analysis
    });

  } catch (err) {
    if (err.message === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'Notice analysis timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    console.error('[analyze-notice] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze the notice. Please try again.',
      details: err.message
    });
  }
});

module.exports = router;
