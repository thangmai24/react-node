// geminiKeyManager.js
const keys = JSON.parse(process.env.GEMINI_API_KEY || "[]");
if (!keys.length) throw new Error("Missing Gemini API Keys");

let currentIndex = 0;

function getNextGeminiKey() {
  const key = keys[currentIndex];
  currentIndex = (currentIndex + 1) % keys.length;
  return key;
}

module.exports = { getNextGeminiKey };
