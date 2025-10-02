import React, { useState } from "react";
import { Volume2 } from "lucide-react";

// Component hiển thị đoạn văn
const TextWithHoverTranslate = ({ text }) => {
  const [hoveredWord, setHoveredWord] = useState(null);
  const [translation, setTranslation] = useState("");

  // Hàm phát âm
  const handleSpeak = (word) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    speechSynthesis.speak(utterance);
  };

  // Hàm dịch (gọi API Google Translate free unofficial)
  const translateWord = async (word) => {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${word}&langpair=en|vi`
      );
      const data = await res.json();
      const translated = data.responseData.translatedText;
      setTranslation(translated);
    } catch (err) {
      setTranslation("Lỗi dịch");
    }
  };

  const words = text.split(" ");

  return (
    <div className="p-6">
      <p className="flex flex-wrap gap-2 text-lg leading-relaxed">
        {words.map((word, idx) => (
          <span
            key={idx}
            className="relative cursor-pointer hover:text-blue-600"
            onMouseEnter={() => {
              setHoveredWord(idx);
              translateWord(word.replace(/[^a-zA-Z]/g, "")); // loại bỏ dấu câu
            }}
            onMouseLeave={() => {
              setHoveredWord(null);
              setTranslation("");
            }}
          >
            {word}
            {hoveredWord === idx && (
              <div className="absolute top-8 left-0 z-10 bg-white border rounded-xl shadow-lg p-3 w-56">
                <p className="font-semibold text-gray-800">{word}</p>
                <p className="text-gray-600">Nghĩa: {translation}</p>
                <button
                  className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={() =>
                    handleSpeak(word.replace(/[^a-zA-Z]/g, ""))
                  }
                >
                  <Volume2 size={16} /> Nghe phát âm
                </button>
              </div>
            )}
          </span>
        ))}
      </p>
    </div>
  );
};

// App chính
export default function Dashboard() {
  const sampleText = `On his deathbed, a father advised his son to always speak truth. 
  The son promised that he would never tell a lie. One day, while going to the city through a forest, 
  he got surrounded by some robbers. One of them asked, “What do you have?” 
  The boy answered, “I have fifty rupees.” They searched him but couldn’t find anything. 
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
