import React, { useState, useRef } from "react";
import { Volume2 } from "lucide-react";

// Component hiển thị đoạn văn
const TextWithHoverTranslate = ({ text }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [translation, setTranslation] = useState("");
  const hideTimeoutRef = useRef(null);
  const cacheRef = useRef({});

  // Phát âm
  const handleSpeak = (word) => {
    const sanitized = word.replace(/[^a-zA-Z]/g, "");
    if (!sanitized) return;
    const utterance = new SpeechSynthesisUtterance(sanitized);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  // Dịch (với cache)
  const translateWord = async (word) => {
    if (!word) {
      setTranslation("");
      return;
    }
    if (cacheRef.current[word]) {
      setTranslation(cacheRef.current[word]);
      return;
    }

    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          word
        )}&langpair=en|vi`
      );
      const data = await res.json();
      const translated = data.responseData?.translatedText || "";
      cacheRef.current[word] = translated;
      setTranslation(translated);
    } catch (err) {
      setTranslation("Lỗi dịch");
    }
  };

  const handleMouseEnter = (idx, word) => {
    // hủy timer ẩn nếu có
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setHoveredWord(idx);
    const sanitized = word.replace(/[^a-zA-Z]/g, "");
    translateWord(sanitized);
  };

  const handleMouseLeave = () => {
    // đợi một chút trước khi ẩn để người dùng kịp di chuột sang popup
    hideTimeoutRef.current = setTimeout(() => {
      hideTimeoutRef.current = null;
    }, 500); 
  };

  // tách theo whitespace để tránh các khoảng trống dư
  const words = text.split(/\s+/);

  return (
    <div className="p-6">
      <p className="flex flex-wrap gap-2 text-lg leading-relaxed">
        {words.map((word, idx) => (
          <div
            key={idx}
            className="relative inline-block"
            onMouseEnter={() => handleMouseEnter(idx, word)}
            onMouseLeave={handleMouseLeave}
          >
            <span className="cursor-pointer hover:text-blue-600 select-text">
              {word}
            </span>

            {hoveredWord === idx && (
              <div
                className="absolute left-[-85] top-full mt-1 z-50 bg-white border rounded-xl shadow-lg p-3 w-56"
                onMouseEnter={() => {
                  if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={handleMouseLeave}
              >
                <p className="font-semibold text-gray-800">{word}</p>
                <p className="text-gray-600">
                  Nghĩa: {translation || "Đang dịch..."}
                </p>
                <button
                  type="button"
                  className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={() => handleSpeak(word)}
                >
                  <Volume2 size={16} /> Nghe phát âm
                </button>
              </div>
            )}
          </div>
        ))}
      </p>
    </div>
  );
};

export { TextWithHoverTranslate };

// App chính (Test)
export default function Test() {
  const sampleText = `On his deathbed, a father advised his son to always speak truth. 
  The son promised that he would never tell a lie. One day, while going to the city through a forest, 
  he got surrounded by some robbers. One of them asked, “What do you have?” 
  The boy answered, “I have fifty rupees.” They searched him but couldn't find anything. 
  When they were about to go, the boy called out, “I am not telling a lie. 
  See this fifty rupee note which I had hidden in my shirt.” 
  The leader of the robbers felt pleased at the truthfulness of the boy, 
  gave him hundred rupees as reward and went away.`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <TextWithHoverTranslate text={sampleText} />
    </div>
  );
}
