const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

dotenv.config();
connectDB();

const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000', 
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
// app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);

// Protected chat route (gọi Gemini API)
app.post('/api/chat', authMiddleware, async (req, res) => {
  try {
    const { message, topic } = req.body; // topic: 'school', 'work', 'daily'

    // System prompt dựa trên topic
    const systemPrompts = {
      school: 'You are a friendly school counselor. Respond conversationally in English, asking follow-up questions about school life.',
      work: 'You are a career advisor. Respond conversationally in English, asking questions about work challenges.',
      daily: 'You are a casual friend. Respond conversationally in English about daily life, suggesting questions to continue the chat.'
    };

    const systemPrompt = systemPrompts[topic] || 'You are a helpful assistant. Respond conversationally in English.';

    // Gọi Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${systemPrompt}\n\nUser: ${message}` }
              ]
            }
          ]
        })
      }
    );

    const data = await geminiResponse.json();

    // Kiểm tra kết quả trả về
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({ msg: 'No response from Gemini API' });
    }

    const aiReply = data.candidates[0].content.parts[0].text;
    res.json({ reply: aiReply });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ msg: 'AI service error' });
  }
});

module.exports = app;
