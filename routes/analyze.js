// routes/analyze.js - Main AI pipeline: Tavily → Gemini → Supabase
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

// Gemini timeout wrapper
const withTimeout = (promise, ms) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT')), ms)
  );
  return Promise.race([promise, timeout]);
};

// Parse Gemini JSON response, retry if needed
async function parseGeminiJSON(model, text, originalPrompt) {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Retry: ask Gemini to fix the JSON
    console.log('[analyze] JSON parse failed, retrying with Gemini fix...');
    const fixPrompt = `The following text was supposed to be valid JSON but has errors. Fix it and return ONLY valid JSON, nothing else:\n\n${cleaned}`;
    const fixResult = await model.generateContent(fixPrompt);
    const fixedText = fixResult.response.text()
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    return JSON.parse(fixedText);
  }
}

router.post('/', async (req, res) => {
  const {
    business_name,
    business_type,
    state,
    turnover,
    employees,
    description = ''
  } = req.body;

  try {
    // -------------------------------------------------------
    // STEP 1: Tavily Search
    // -------------------------------------------------------
    let searchContext = '';
    try {
      const tavilyResponse = await axios.post(
        'https://api.tavily.com/search',
        {
          api_key: process.env.TAVILY_API_KEY,
          query: `${business_type} business compliance requirements ${state} India 2025 GST FSSAI labour law`,
          search_depth: 'basic',
          max_results: 3
        },
        { timeout: 15000 }
      );
      searchContext = JSON.stringify(tavilyResponse.data?.results || []);
    } catch (tavilyErr) {
      console.warn('[analyze] Tavily search failed (non-fatal):', tavilyErr.message);
      searchContext = 'No search context available.';
    }

    // -------------------------------------------------------
    // STEP 2: Gemini Analysis
    // -------------------------------------------------------
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction:
        'You are an expert Indian MSME compliance advisor. You have deep knowledge of GST laws, labour laws, food safety regulations, state-specific business laws, and all compliance requirements for Indian small businesses. Always return valid JSON only. No markdown. No backticks. No explanation outside JSON.'
    });

    const prompt = `Analyze this Indian MSME and generate a complete compliance report.

Business Details:
- Name: ${business_name}
- Type: ${business_type}
- State: ${state}
- Annual Turnover: ${turnover}
- Employees: ${employees}
- Additional Info: ${description}

Recent Search Context: ${searchContext}

Return this EXACT JSON structure with no deviation:
{
  "business_profile": {
    "name": "business name",
    "type": "type of business",
    "state": "state name",
    "turnover": "turnover range",
    "employees": "employee count",
    "risk_level": "LOW or MEDIUM or HIGH",
    "industry_category": "broad category"
  },
  "compliance_health_score": number between 0 and 100,
  "compliances": [
    {
      "id": "compliance_1",
      "name": "full compliance name",
      "category": "Tax or Labour or Food Safety or Municipal or Environmental or Other",
      "is_mandatory": true or false,
      "applies_to_this_business": true or false,
      "reason_why": "specific reason why this applies to this exact business",
      "current_status": "PENDING or COMPLIANT or OVERDUE or NOT_APPLICABLE",
      "priority": "HIGH or MEDIUM or LOW",
      "deadline": "specific deadline description",
      "penalty_if_missed": "exact penalty with amount",
      "government_portal": "official government URL",
      "estimated_cost": "cost in rupees to comply",
      "time_to_complete": "number of days typically needed",
      "documents_needed": ["list", "of", "documents"]
    }
  ],
  "priority_actions": [
    {
      "action_number": 1,
      "title": "short action title",
      "urgency": "IMMEDIATE or THIS_WEEK or THIS_MONTH",
      "consequence": "what happens if ignored",
      "estimated_time": "time to complete",
      "steps": [
        "Step 1: detailed instruction",
        "Step 2: detailed instruction",
        "Step 3: detailed instruction"
      ],
      "portal_link": "official URL",
      "estimated_cost": "cost if any"
    }
  ],
  "generated_documents": [
    {
      "doc_id": "doc_1",
      "title": "document title",
      "doc_type": "Registration Guide or Legal Notice or Compliance Summary or Application Draft or Response Letter",
      "content": "complete ready-to-use document content with all details filled in for this specific business. Minimum 200 words per document.",
      "usage_instructions": "how and where to use this",
      "portal_to_submit": "where to submit if applicable"
    }
  ],
  "compliance_calendar": [
    {
      "month": "April 2026",
      "tasks": [
        {
          "task_name": "task description",
          "due_date": "specific date",
          "compliance_id": "reference id",
          "priority": "HIGH or MEDIUM or LOW",
          "penalty_if_late": "penalty amount"
        }
      ]
    }
  ],
  "plain_language_summary": "Write 4 paragraphs explaining everything in very simple English. Imagine you are explaining to someone who has never heard words like GST or FSSAI before. Be warm, helpful and encouraging.",
  "estimated_total_cost": "total estimated compliance cost per year in rupees",
  "total_compliances_required": number,
  "high_priority_count": number,
  "documents_generated_count": number
}`;

    const geminiResult = await withTimeout(
      model.generateContent(prompt),
      30000
    );

    if (geminiResult === undefined) {
      return res.status(504).json({
        success: false,
        error: 'Gemini AI request timed out after 30 seconds. Please try again.',
        details: 'Timeout exceeded while waiting for compliance analysis.'
      });
    }

    const rawText = geminiResult.response.text();
    const complianceReport = await parseGeminiJSON(model, rawText, prompt);

    // -------------------------------------------------------
    // STEP 4: Save to Supabase
    // -------------------------------------------------------
    let sessionId = null;
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );

      const { data: insertedRow, error: dbError } = await supabase
        .from('sessions')
        .insert([
          {
            business_name,
            business_type,
            state,
            turnover,
            employees,
            description,
            compliance_report: JSON.stringify(complianceReport),
            created_at: new Date().toISOString()
          }
        ])
        .select('id')
        .single();

      if (dbError) {
        console.warn('[analyze] Supabase insert failed (non-fatal):', dbError.message);
      } else {
        sessionId = insertedRow?.id || null;
      }
    } catch (dbErr) {
      console.warn('[analyze] Supabase error (non-fatal):', dbErr.message);
    }

    // -------------------------------------------------------
    // STEP 5: Return response
    // -------------------------------------------------------
    return res.json({
      success: true,
      session_id: sessionId,
      data: complianceReport
    });

  } catch (err) {
    // Handle timeout specifically
    if (err.message === 'TIMEOUT') {
      return res.status(504).json({
        success: false,
        error: 'The analysis took too long. Please try again.',
        details: 'Gemini API timeout after 30 seconds.'
      });
    }

    console.error('[analyze] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report. Please try again.',
      details: err.message
    });
  }
});

module.exports = router;
