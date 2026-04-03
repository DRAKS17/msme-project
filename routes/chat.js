// routes/chat.js - Followup chat with business context
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
  const {
    question,
    business_context = {},
    chat_history = []
  } = req.body;

  const {
    name: bizName = 'this business',
    type: bizType = 'business',
    state: bizState = 'India',
    turnover = '',
    employees = ''
  } = business_context;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are a friendly and knowledgeable MSME compliance expert chatbot for Indian businesses. You are talking to the owner of ${bizType} business called ${bizName} in ${bizState}. Always give answers specific to their business. Keep answers concise - maximum 150 words. Always end with one helpful tip or next step. Never use legal jargon without explaining it.`
    });

    // Build history for multi-turn chat
    const history = chat_history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({ history });

    // Main answer
    const mainResult = await withTimeout(
      chat.sendMessage(question),
      30000
    );

    if (mainResult === undefined) {
      return res.status(504).json({
        success: false,
        error: 'Response timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    const answer = mainResult.response.text();

    // Generate suggested follow-up questions
    let suggestedQuestions = [];
    try {
      const suggestModel = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: 'Return only a JSON array of 3 strings. No other text.'
      });

      const suggestResult = await withTimeout(
        suggestModel.generateContent(
          `Given that a ${bizType} owner in ${bizState} just asked: "${question}" and received this answer: "${answer}", what are the 3 most helpful follow-up questions they should ask next? Return only a JSON array of 3 question strings.`
        ),
        15000
      );

      if (suggestResult) {
        const rawSuggest = suggestResult.response
          .text()
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        suggestedQuestions = JSON.parse(rawSuggest);
      }
    } catch (suggestErr) {
      console.warn('[chat] Failed to generate suggested questions:', suggestErr.message);
      suggestedQuestions = [
        'What documents do I need to prepare first?',
        'What are the penalties if I miss a compliance deadline?',
        'How can I register online for this compliance?'
      ];
    }

    return res.json({
      success: true,
      answer,
      suggested_questions: suggestedQuestions
    });

  } catch (err) {
    if (err.message === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'The chat response timed out. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    console.error('[chat] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to get a response. Please try again.',
      details: err.message
    });
  }
});

module.exports = router;
