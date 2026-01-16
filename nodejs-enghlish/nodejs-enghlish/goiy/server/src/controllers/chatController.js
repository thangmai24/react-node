const Chat = require('../models/Chat');
const jwt = require('jsonwebtoken');
const { getNextGeminiKey } = require('../config/geminiKeyManager');



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

IMPORTANT RULE:
- You MUST reply ONLY in English.
- Even if the user writes in another language, translate internally and respond in English.
- NEVER respond in any other language.

`,

  work: `
You are a career advisor.
Keep responses concise, practical, and focused on the main point.

IMPORTANT RULE:
- You MUST reply ONLY in English.
- Ignore the language of the user's input.
- Respond in English only.

`,

  daily: `
You are a casual, friendly companion.
Keep responses warm and natural.

IMPORTANT RULE:
- Always reply in English.
- Do not switch languages under any circumstances.

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
    const key = getNextGeminiKey();
    if (!key.length) throw new Error("Missing Gemini API Keys");
    console.log("Using Gemini Key:", key);
   

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

const pickGeminiKey = () => {
  const keys = JSON.parse(process.env.GEMINI_API_KEY || '[]');
  if (!keys.length) throw new Error('Missing Gemini API Keys');
  return keys[Math.floor(Math.random() * keys.length)];
};

const normalizeText = (text) => {
  return String(text || '')
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
};

const cleanTranscriptText = (raw) => {
  let t = String(raw || '');
  t = t.replace(/\b\d+\s*[-–]\s*\d+\b/g, ' ');
  t = t.replace(/\b[WM]-[A-Za-z]+:?/g, ' ');
  t = t.replace(/\d+/g, ' ');
  t = t.replace(/[(){}\[\]]+/g, ' ');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
};

const checkDictation = async (req, res) => {
  try {
    const { original, userText } = req.body;
    if (!original || !userText) {
      return res.status(400).json({ msg: 'original and userText are required' });
    }

    const key = pickGeminiKey();
    const prompt = `
Bạn là giáo viên tiếng Anh.
So sánh câu gốc và câu học viên gõ lại.
Cho phép sai khác nhỏ về viết hoa, khoảng trắng.
Trả về JSON duy nhất theo mẫu:
{"correct": true|false, "feedback": "giải thích ngắn bằng tiếng Việt"}

Câu gốc: "${original}"
Câu học viên: "${userText}"
`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('Dictation check HTTP error', response.status, text);
      return res.status(500).json({ msg: 'AI service error' });
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates.length) {
      return res.status(500).json({ msg: 'AI response empty' });
    }

    const raw = data.candidates[0].content.parts[0].text || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const isEqual = normalizeText(original) === normalizeText(userText);
      parsed = {
        correct: isEqual,
        feedback: isEqual ? 'Bạn gõ đúng câu tiếng Anh.' : 'Câu gõ lại chưa khớp với câu gốc.'
      };
    }

    return res.json({
      correct: Boolean(parsed.correct),
      feedback: String(parsed.feedback || '')
    });
  } catch (err) {
    console.error('Dictation check error', err);
    const isEqual = normalizeText(req.body?.original) === normalizeText(req.body?.userText);
    return res.status(500).json({
      msg: 'AI service error',
      fallback: {
        correct: isEqual,
        feedback: isEqual ? 'Bạn gõ đúng câu tiếng Anh.' : 'Câu gõ lại chưa khớp với câu gốc.'
      }
    });
  }
};

const translateWithImage = async (req, res) => {
  try {
    const { text, image } = req.body;
    if (!text) return res.status(400).json({ msg: 'text is required' });

    const key = pickGeminiKey();

    const parts = [
      {
        text: `
Dịch đoạn tiếng Anh sau sang tiếng Việt tự nhiên, giữ đúng ý.
Nếu có hình ảnh kèm theo, dùng nó làm ngữ cảnh để chọn từ vựng phù hợp.
Chỉ trả về bản dịch tiếng Việt, không thêm giải thích.

Đoạn tiếng Anh:
${text}
`
      }
    ];

    if (image) {
      let mimeType = 'image/png';
      let dataBase64 = image;
      const match = String(image).match(/^data:(.*?);base64,(.+)$/);
      if (match) {
        mimeType = match[1] || mimeType;
        dataBase64 = match[2];
      }

      parts.push({
        inlineData: {
          mimeType,
          data: dataBase64
        }
      });
    }

    const body = {
      contents: [
        {
          role: 'user',
          parts
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const textBody = await response.text();
      console.error('Dictation translate HTTP error', response.status, textBody);
      return res.status(500).json({ msg: 'AI service error' });
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates.length) {
      return res.status(500).json({ msg: 'AI response empty' });
    }

    const partsOut = data.candidates[0].content.parts || [];
    const translation = partsOut.map(p => p.text || '').join('').trim();

    return res.json({ translation });
  } catch (err) {
    console.error('Dictation translate error', err);
    return res.status(500).json({ msg: 'AI service error' });
  }
};

const splitTextWithAI = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ msg: 'text is required' });

    const cleaned = cleanTranscriptText(text);

    const key = pickGeminiKey();
    const prompt = `
Bạn nhận một đoạn transcript tiếng Anh có thể chứa số câu hỏi, chỉ số như 32-34, ký hiệu người nói như W-Am, M-Au và các phần xuống dòng lộn xộn.
Hãy loại bỏ hoàn toàn mọi số (kể cả dính liền với chữ, ví dụ: 32Thank → Thank), loại bỏ các ký hiệu người nói, ký hiệu câu hỏi và dấu ngoặc dư như ")".
Giữ lại duy nhất câu tiếng Anh tự nhiên.
Sau đó chia đoạn đó thành các câu hoàn chỉnh theo dấu chấm, dấu hỏi, dấu chấm than.
Chỉ trả về JSON với dạng:
{"sentences": ["Câu 1...", "Câu 2...", "..."]}

Transcript:
${cleaned}
`;

    const body = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const textBody = await response.text();
      console.error('Dictation split HTTP error', response.status, textBody);
      const fallback = cleanTranscriptText(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return res.status(200).json({ sentences: fallback });
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates.length) {
      const fallback = cleanTranscriptText(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return res.status(200).json({ sentences: fallback });
    }

    const raw = data.candidates[0].content.parts[0].text || '';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      const fallback = cleanTranscriptText(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return res.status(200).json({ sentences: fallback });
    }

    const sentences = Array.isArray(parsed.sentences)
      ? parsed.sentences
          .map((s) => cleanTranscriptText(s))
          .map((s) => String(s || '').trim())
          .filter(Boolean)
      : [];

    if (!sentences.length) {
      const fallback = cleanTranscriptText(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return res.status(200).json({ sentences: fallback });
    }

    return res.json({ sentences });
  } catch (err) {
    console.error('Dictation split error', err);
    const fallback = cleanTranscriptText(req.body?.text)
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return res.status(200).json({ sentences: fallback });
  }
};

module.exports = { sendChat, checkDictation, translateWithImage, splitTextWithAI };
