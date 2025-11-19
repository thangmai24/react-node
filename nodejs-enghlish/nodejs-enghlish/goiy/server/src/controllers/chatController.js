const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');

// Lịch sử chat lưu trong RAM theo từng user
const chatHistory = {}; 
let r = 0;

const MAX_HISTORY = 20; // số lượng tin tối đa lưu trong RAM

// System prompts tối ưu
const systemPrompts = {
  school: `
You are a friendly school counselor.
Keep responses short, natural, supportive, and focused on the main idea.
Always use previous conversation context to understand the user's intent.
Assume each new message is connected to earlier ones unless stated otherwise.
Do not repeat user words unnecessarily.
Answer in English.
`,

  work: `
You are a career advisor.
Keep responses concise, practical, and focused on the main point.
Always rely on earlier messages to interpret new questions.
Assume each new message continues from previous context.
Avoid repeating user content unless necessary.
Answer in English.
`,

  daily: `
You are a casual, friendly companion.
Keep responses short, natural, warm, and conversation-like.
Always depend on earlier messages to understand user intent.
Assume new messages relate to the previous context unless clearly unrelated.
Do not repeat user words unnecessarily.
Answer in English.
`
};

const sendChat = async (req, res) => {
  try {
    const { message, topic } = req.body;

    // Lấy token và decode user ID
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Nếu chưa có lịch sử thì tạo mới
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }

    // ---- Thêm system prompt vào đầu nếu lịch sử trống ----
    if (chatHistory[userId].length === 0) {
      const systemPrompt =
        systemPrompts[topic] ||
        `Keep responses short, natural, and based on previous conversation context. Answer in English.`;

      chatHistory[userId].push({
        role: 'system',
        text: systemPrompt
      });
    }

    // ---- Thêm tin user vào lịch sử ----
    chatHistory[userId].push({
      role: 'user',
      text: message
    });

    // ---- Giới hạn số lượng tin ----
    if (chatHistory[userId].length > MAX_HISTORY) {
      chatHistory[userId] = chatHistory[userId].slice(-MAX_HISTORY);
    }

    // ---- Xoay vòng API key ----
    const keys = JSON.parse(process.env.GEMINI_API_KEY || '[]');
    r = (r + 1) % keys.length;

    // ---- Convert lịch sử sang format Gemini ----
    const geminiMessages = chatHistory[userId].map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));

    // ---- Gọi Gemini API ----
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${keys[r]}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: geminiMessages
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({ msg: 'No response from Gemini API' });
    }

    const aiReply = data.candidates[0].content.parts[0].text;

    // ---- Lưu câu trả lời AI vào history ----
    chatHistory[userId].push({
      role: 'assistant',
      text: aiReply
    });

    // ---- Giới hạn lại (phòng trường hợp API trả về dài) ----
    if (chatHistory[userId].length > MAX_HISTORY) {
      chatHistory[userId] = chatHistory[userId].slice(-MAX_HISTORY);
    }

    return res.json({
      reply: aiReply,
      key: r
    });

  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ msg: 'AI service error' });
  }
};

module.exports = {
  sendChat
};
