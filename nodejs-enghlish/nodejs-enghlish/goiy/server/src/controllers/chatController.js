const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');

// =====================================
// 🔥 RAM STORAGE + AUTO EXPIRE
// =====================================
const chatHistory = new Map();

const HISTORY_LIMIT = 20;                // tối đa 20 tin
const EXPIRATION_TIME = 5 * 60 * 1000;   // 5 phút

// Auto cleanup mỗi phút
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of chatHistory.entries()) {
    if (data.expiresAt < now) {
      chatHistory.delete(userId);
    }
  }
}, 60 * 1000);

// =====================================
// 🔥 SYSTEM PROMPTS (role = user)
// =====================================
const systemPrompts = {
  school: `
You are a friendly school counselor.
Keep responses short, natural, supportive, and focused on the main idea.
Always use previous conversation context.
Answer in English.
`,

  work: `
You are a career advisor.
Keep responses concise, practical, and focused on the main point.
Use earlier messages for context.
Answer in English.
`,

  daily: `
You are a casual, friendly companion.
Keep responses warm and natural.
Use conversation history.
Answer in English.
`
};

// =====================================
// 🔥 MAIN CHAT CONTROLLER
// =====================================
const sendChat = async (req, res) => {
  try {
    const { message, topic } = req.body;

    // Lấy user ID từ JWT
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // =====================================
    // TẠO HOẶC LẤY LỊCH SỬ
    // =====================================
    let historyData = chatHistory.get(userId);

    if (!historyData) {
      historyData = {
        messages: [],
        expiresAt: Date.now() + EXPIRATION_TIME
      };
      chatHistory.set(userId, historyData);
    }

    const history = historyData.messages;

    // =====================================
    // THÊM SYSTEM PROMPT DƯỚI ROLE USER
    // =====================================
    if (history.length === 0) {
      history.push({
        role: "user",  // Gemini ONLY supports "user" & "model"
        text: systemPrompts[topic] || `Keep responses short and use context.`
      });
    }

    // =====================================
    // THÊM USER MESSAGE
    // =====================================
    history.push({
      role: "user",
      text: message
    });

    // Giới hạn số tin
    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    // Reset thời gian sống
    historyData.expiresAt = Date.now() + EXPIRATION_TIME;

    // =====================================
    // CHUẨN BỊ DỮ LIỆU GỬI LÊN GEMINI
    // =====================================
    const geminiMessages = history.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }]
    }));

    // Lấy API key ngẫu nhiên
    const keys = JSON.parse(process.env.GEMINI_API_KEY || "[]");
    if (!keys.length) throw new Error("Missing Gemini API Keys");

    const key = keys[Math.floor(Math.random() * keys.length)];

    // =====================================
    // CALL GEMINI API
    // =====================================
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: geminiMessages })
      }
    );

    // HTTP lỗi
    if (!response.ok) {
      const text = await response.text();

      console.error("🔥 GEMINI HTTP ERROR");
      console.error("Status:", response.status);
      console.error("StatusText:", response.statusText);
      console.error("Details:", text);

      return res.status(500).json({
        msg: "Gemini HTTP Error",
        status: response.status,
        statusText: response.statusText,
        details: text
      });
    }

    const data = await response.json();

    // Lỗi JSON từ Gemini
    if (data.error) {
      return res.status(500).json({
        msg: "Gemini API Error",
        error: data.error.message,
        raw: data.error
      });
    }

    // Không có câu trả lời
    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({
        msg: "Gemini returned no candidates",
        raw: data
      });
    }

    const aiReply = data.candidates[0].content.parts[0].text;

    // =====================================
    // LƯU TRẢ LỜI AI
    // =====================================
    history.push({
      role: "assistant",
      text: aiReply
    });

    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    return res.json({ reply: aiReply });

  } catch (err) {
    console.error("🔥 Gemini Error:", err);
    return res.status(500).json({ msg: "AI service error" });
  }
};

module.exports = { sendChat };
