# MSME Sahay Agent - AI-Powered Compliance Advisor

An intelligent backend API that helps Indian small businesses navigate complex compliance requirements, powered by Google Gemini AI, Tavily Search, and Supabase.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Middleware](#middleware)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)
- [License](#license)

---

## Overview

MSME Sahay Agent is a Node.js and Express REST API built for Indian Micro, Small and Medium Enterprises (MSMEs). It acts as an AI-powered compliance advisor that:

- Analyzes a business's compliance requirements (GST, Labour, FSSAI, Municipal, etc.)
- Generates ready-to-use compliance documents and response letters
- Answers business-specific compliance questions via a conversational chatbot
- Analyzes government notices and generates draft response letters
- Stores session data in Supabase for continuity


---

## Features

| Feature | Description |
|---|---|
| Real-time Web Search | Fetches latest compliance rules via Tavily Search API |
| AI Compliance Analysis | Powered by Google Gemini 1.5 Flash |
| Document Generation | Auto-generates registration guides, application drafts, legal notices |
| Context-aware Chatbot | Multi-turn chat with full business context |
| Notice Analyzer | Decodes government notices and drafts reply letters |
| Compliance Calendar | Month-wise compliance task schedule |
| Session Persistence | Saves all analysis results to Supabase |
| Rate Limiting | 20 requests per minute per IP |
| Request Logging | Every API call is logged |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 18.0.0 |
| Framework | Express.js 4.x |
| AI Model | Google Gemini 1.5 Flash (@google/generative-ai) |
| Web Search | Tavily Search API |
| Database | Supabase (PostgreSQL) |
| Rate Limiting | express-rate-limit |
| HTTP Client | Axios |
| Dev Server | Nodemon |

---

## Project Structure

```
orbit/
├── server.js                  # App entry point — registers middleware and routes
├── package.json
├── .env                       # Environment variables (never commit)
├── .gitignore
│
├── routes/
│   ├── health.js              # GET  /api/health
│   ├── analyze.js             # POST /api/analyze        (main AI pipeline)
│   ├── chat.js                # POST /api/chat           (conversational Q&A)
│   ├── generateDocument.js    # POST /api/generate-document
│   └── analyzeNotice.js       # POST /api/analyze-notice
│
└── middleware/
    ├── logger.js              # Request logging
    ├── rateLimiter.js         # 20 req/min per IP
    └── validate.js            # Input validation for all endpoints
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm
- A Google Gemini API key (https://aistudio.google.com/app/apikey)
- A Tavily API key (https://tavily.com)
- A Supabase project (https://supabase.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/DRAKS17/msme-project.git
cd msme-project

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your API keys in .env

# 4. Start the development server
npm run dev
```

The server will be running at: http://localhost:3000

### Scripts

| Command | Description |
|---|---|
| `npm start` | Start production server with Node |
| `npm run dev` | Start development server with Nodemon (auto-restart) |

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# Tavily Search API
TAVILY_API_KEY=your_tavily_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Never commit your `.env` file to version control. It is already listed in `.gitignore`.

---

## API Reference

Base URL: `http://localhost:3000`

---

### GET /api/health

Check if the server is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

### POST /api/analyze

The main AI pipeline. Analyzes a business and generates a full compliance report.

Pipeline steps:
1. Tavily searches for the latest compliance rules for the given business type and state
2. Gemini AI analyzes the business and generates a structured compliance report
3. The report is saved to Supabase and a session_id is returned

**Request Body:**
```json
{
  "business_name": "Sharma Kirana Store",
  "business_type": "Grocery Retail",
  "state": "Maharashtra",
  "turnover": "Below 40 Lakhs",
  "employees": "5",
  "description": "We sell packaged food and beverages"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `business_name` | string | Yes | Name of the business |
| `business_type` | string | Yes | Type/industry of the business |
| `state` | string | Yes | State where the business operates |
| `turnover` | string | Yes | Annual turnover range |
| `employees` | string | Yes | Number of employees |
| `description` | string | No | Additional business description |

**Response:**
```json
{
  "success": true,
  "session_id": "uuid-from-supabase",
  "data": {
    "business_profile": {},
    "compliance_health_score": 62,
    "compliances": [],
    "priority_actions": [],
    "generated_documents": [],
    "compliance_calendar": [],
    "plain_language_summary": "...",
    "estimated_total_cost": "45000 per year",
    "total_compliances_required": 8,
    "high_priority_count": 3,
    "documents_generated_count": 4
  }
}
```

---

### POST /api/chat

Ask a compliance question in the context of a specific business. Supports multi-turn conversations.

**Request Body:**
```json
{
  "question": "Do I need a food license?",
  "business_context": {
    "name": "Sharma Kirana Store",
    "type": "Grocery Retail",
    "state": "Maharashtra",
    "turnover": "Below 40 Lakhs",
    "employees": "5"
  },
  "chat_history": [
    { "role": "user", "content": "What is GST?" },
    { "role": "assistant", "content": "GST stands for..." }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `question` | string | Yes | The compliance question to ask |
| `business_context` | object | Yes | Business details (must include name) |
| `chat_history` | array | No | Previous messages for multi-turn context |

**Response:**
```json
{
  "success": true,
  "answer": "Yes, as a grocery retailer selling packaged food in Maharashtra...",
  "suggested_questions": [
    "How do I register for FSSAI?",
    "What documents are needed for FSSAI registration?",
    "How long does FSSAI registration take?"
  ]
}
```

---

### POST /api/generate-document

Generate a compliance-related document for a business such as a registration guide or application draft.

**Request Body:**
```json
{
  "document_type": "GST Registration Guide",
  "business_profile": {
    "name": "Sharma Kirana Store",
    "type": "Grocery Retail",
    "state": "Maharashtra"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `document_type` | string | Yes | Type of document to generate |
| `business_profile` | object | Yes | Business details (must include name) |

**Response:**
```json
{
  "success": true,
  "document": {
    "title": "GST Registration Guide for Sharma Kirana Store",
    "content": "...",
    "usage_instructions": "...",
    "portal_to_submit": "https://gst.gov.in"
  }
}
```

---

### POST /api/analyze-notice

Analyze a government or regulatory notice received by a business. Returns a plain-language explanation and a draft response letter.

**Request Body:**
```json
{
  "notice_text": "Dear Sir/Madam, You are hereby directed to appear before this office...",
  "business_profile": {
    "name": "Sharma Kirana Store",
    "type": "Grocery Retail",
    "state": "Maharashtra"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `notice_text` | string | Yes | Full text of the government notice |
| `business_profile` | object | Yes | Business details (must include name) |

**Response:**
```json
{
  "success": true,
  "analysis": {
    "notice_type": "GST Scrutiny Notice",
    "issuing_authority": "GST Department, Maharashtra",
    "seriousness_level": 7,
    "seriousness_label": "Serious",
    "plain_explanation": "This notice means the tax department wants to verify your GST filings...",
    "required_actions": ["Gather invoices for the period mentioned", "Consult a CA"],
    "deadline": "Within 15 days of receipt",
    "consequence_if_ignored": "Penalty up to 25000 and potential prosecution",
    "response_letter": "Dear Sir, With reference to the notice dated...",
    "next_steps": ["Step 1", "Step 2", "Step 3"]
  }
}
```

---

## Middleware

| File | Purpose |
|---|---|
| `middleware/logger.js` | Logs method, URL, and timestamp for every request |
| `middleware/rateLimiter.js` | Limits each IP to 20 requests per minute |
| `middleware/validate.js` | Validates required fields before reaching route handlers |

---

## Error Handling

All endpoints return a consistent error format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details for debugging"
}
```

| HTTP Status | Meaning |
|---|---|
| `400` | Bad Request — missing or invalid input |
| `404` | Endpoint not found |
| `429` | Too Many Requests — rate limit exceeded |
| `504` | Gateway Timeout — Gemini AI took too long (over 30 seconds) |
| `500` | Internal Server Error — unexpected failure |

---

## Database Schema

The `sessions` table in Supabase stores each analysis result:

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Auto-generated session ID |
| `business_name` | text | Name of the business |
| `business_type` | text | Type of business |
| `state` | text | State of operation |
| `turnover` | text | Annual turnover |
| `employees` | text | Employee count |
| `description` | text | Additional info |
| `compliance_report` | jsonb | Full Gemini-generated report |
| `created_at` | timestamp | When the session was created |

---

## License

MIT License

---

Built for Indian MSMEs at ORBIT Agentic Hyperthon by the MSME Sahay Team.
