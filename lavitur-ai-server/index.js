// index.js
const express = require('express');
const cors    = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// v4 SDK client
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Instantiate OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/api/ai', async (req, res) => {
  // Ensure the frontend is sending { message: "..." }
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'No message provided' });
  }

  try {
    // Call the OpenAI chat completion endpoint
      const response = await openai.chat.completions.create({ 
        model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are Lavitúr’s AI concierge.' },
        { role: 'user',   content: message }
      ]
       });
console.log("📥 raw OpenAI response:", JSON.stringify(response, null, 2));

    // v4 SDK: response.choices is an array
    const aiReply = response.choices?.[0]?.message?.content;
    if (!aiReply) {
      return res.status(500).json({ error: 'No reply from AI' });
    }

    return res.json({ reply: aiReply.trim() });

  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'AI request failed' });
  }
});

app.listen(PORT, () => {
  console.log(`AI backend running at http://localhost:${PORT}`);
});
