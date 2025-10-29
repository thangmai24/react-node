const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const noteRoutes = require('./routes/noteRoutes');
dotenv.config();

require('./config/cloudinary');
connectDB();

const app = express();

const corsOptions = {
  origin: [ 
    process.env.CORS_ORIGIN ,'http://localhost:3000'
  ],

  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.post('/api/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.use('/api/notes', authMiddleware, noteRoutes);


// Tạo object lưu lịch sử chat theo user
const chatHistory = {};
let r = 0;
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

    
     
    const keys = JSON.parse(process.env.GEMINI_API_KEY || '[]');
    r = (r + 1) % keys.length;
    // Gọi Gemini API
    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + keys[r],
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
    res.json({ reply: aiReply, key: r });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ msg: 'AI service error' });
  }
});

module.exports = app;
