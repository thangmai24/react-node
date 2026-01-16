import React, { useState, useEffect } from 'react';
import Navbar from '../component/Nav';
import { dictationAPI } from '../services/api';
import { FaPlay, FaSpinner, FaImage, FaCog } from 'react-icons/fa';

const DictationPage = () => {
  const [inputText, setInputText] = useState('');
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userText, setUserText] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [activeTab, setActiveTab] = useState('dictation');
  const [wordResult, setWordResult] = useState(null);
  const [showAnswerImmediately, setShowAnswerImmediately] = useState(true);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatCount, setRepeatCount] = useState(1);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const list = synth.getVoices();
      setVoices(list);
      if (!selectedVoice && list.length) {
        const defaultVoice = list.find((v) => v.lang && v.lang.toLowerCase().startsWith('en')) || list[0];
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      }
    };

    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  const handleSplit = () => {
    const parts = String(inputText)
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    setSentences(parts);
    setCurrentIndex(0);
    setUserText('');
    setCheckResult(null);
    setTranslation('');
    setWordResult(null);
    setShowFullAnswer(false);
    setInputText('');
  };

  const handleAISplit = async () => {
    if (!inputText.trim() || splitting) return;
    try {
      setSplitting(true);
      const { data } = await dictationAPI.split({ text: inputText });
      const parts = (data.sentences || []).map((s) => String(s || '').trim()).filter(Boolean);
      setSentences(parts);
      setCurrentIndex(0);
      setUserText('');
      setCheckResult(null);
      setTranslation('');
      setWordResult(null);
      setShowFullAnswer(false);
      setInputText('');
    } catch (err) {
      const parts = String(inputText)
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(Boolean);
      setSentences(parts);
    } finally {
      setSplitting(false);
    }
  };

  const speakSentence = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const countRaw = Number(repeatCount) || 1;
    const count = Math.min(5, Math.max(1, countRaw));
    for (let i = 0; i < count; i += 1) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = Number(playbackRate) || 1;
      if (voices.length && selectedVoice) {
        const voice = voices.find((v) => v.name === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
      }
      synth.speak(utterance);
    }
  };

  const buildWordFeedback = (sentence, userInput) => {
    const normalize = (w) => String(w || '')
      .toLowerCase()
      .replace(/[^a-z0-9']/g, '');

    const originalWords = String(sentence).trim().split(/\s+/);
    const userWords = String(userInput).trim().split(/\s+/);

    const maskedParts = [];
    let firstWrong = null;

    for (let i = 0; i < originalWords.length; i += 1) {
      const ow = originalWords[i];
      const uw = userWords[i];
      const ok = normalize(ow) === normalize(uw);
      if (!ok && firstWrong === null) {
        firstWrong = ow;
      }
      maskedParts.push(ok ? ow : '*'.repeat(ow.length));
    }

    const correct = firstWrong === null && userWords.length === originalWords.length;

    return {
      correct,
      maskedSentence: maskedParts.join(' '),
      hintWord: firstWrong
    };
  };

  const handleWordCheck = () => {
    if (!sentences.length || !userText.trim()) return;
    const original = sentences[currentIndex];
    const result = buildWordFeedback(original, userText);
    setWordResult(result);
  };

  const handleSkip = () => {
    if (!sentences.length) return;
    const nextIndex = Math.min(sentences.length - 1, currentIndex + 1);
    setCurrentIndex(nextIndex);
    setUserText('');
    setWordResult(null);
    setShowFullAnswer(false);
  };

  const handleCheck = async () => {
    if (!sentences.length || !userText.trim() || checking) return;
    try {
      setChecking(true);
      setCheckResult(null);
      const original = sentences[currentIndex];
      const { data } = await dictationAPI.check({
        original,
        userText
      });
      setCheckResult(data);
    } catch (err) {
      setCheckResult({
        correct: false,
        feedback: 'Không kiểm tra được. Vui lòng thử lại.'
      });
    } finally {
      setChecking(false);
    }
  };

  const handleTranslate = async () => {
    if (!sentences.length || translating) return;
    try {
      setTranslating(true);
      setTranslation('');
      const text = sentences[currentIndex];
      const { data } = await dictationAPI.translate({
        text,
        image: imageData
      });
      setTranslation(data.translation || '');
    } catch (err) {
      setTranslation('Không dịch được. Vui lòng thử lại.');
    } finally {
      setTranslating(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setImageData(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const currentSentence = sentences[currentIndex] || '';

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              Luyện nghe - chép chính tả theo đoạn
            </h1>
            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaCog className="mr-2" />
              Cài đặt giọng đọc
            </button>
          </div>

          {showSettings && (
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tốc độ đọc
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value) || 1)}
                    className="w-full"
                  />
                  <div className="mt-1 text-xs text-gray-600">
                    {playbackRate.toFixed(1)}x
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lần đọc lại
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={repeatCount}
                    onChange={(e) => {
                      let value = parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) value = 1;
                      if (value < 1) value = 1;
                      if (value > 5) value = 5;
                      setRepeatCount(value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giọng đọc (nếu có)
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    disabled={!voices.length}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {!voices.length && (
                      <option value="">Không có giọng đọc khả dụng</option>
                    )}
                    {voices.length > 0 && (
                      <>
                        {!selectedVoice && <option value="">Chọn giọng đọc</option>}
                        {voices.map((voice) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dán đoạn tiếng Anh
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Dán đoạn hội thoại tiếng Anh vào đây..."
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                onClick={handleSplit}
                disabled={!inputText.trim()}
                className={`px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors ${!inputText.trim() ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Chia thành từng câu
              </button>
              <button
                onClick={handleAISplit}
                disabled={!inputText.trim() || splitting}
                className={`px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center ${
                  !inputText.trim() || splitting ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {splitting && <FaSpinner className="animate-spin mr-2" />}
                Chia câu bằng AI
              </button>
            </div>
          </div>

          {sentences.length > 0 && (
            <>
              <div className="mb-4 flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('dictation')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'dictation'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dictation
                </button>
                <button
                  onClick={() => setActiveTab('study')}
                  className={`ml-2 px-4 py-2 text-sm font-medium border-b-2 ${
                    activeTab === 'study'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Xem câu và dịch
                </button>
              </div>

              {activeTab === 'dictation' && (
                <div className="max-w-3xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-gray-600">
                      Câu {currentIndex + 1} / {sentences.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentIndex === 0
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Trước
                      </button>
                      <button
                        onClick={() =>
                          setCurrentIndex((prev) => Math.min(sentences.length - 1, prev + 1))
                        }
                        disabled={currentIndex === sentences.length - 1}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentIndex === sentences.length - 1
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Tiếp
                      </button>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex-1 h-10 rounded-full bg-gray-100 flex items-center px-4 text-sm text-gray-600">
                      Nghe câu và gõ lại bên dưới
                    </div>
                    <button
                      onClick={() => speakSentence(currentSentence)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0"
                    >
                      <FaPlay className="ml-0.5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <textarea
                      value={userText}
                      onChange={(e) => setUserText(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Type what you hear..."
                    />
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={handleWordCheck}
                      disabled={!userText.trim()}
                      className={`px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors ${
                        !userText.trim() ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      Check
                    </button>
                    <button
                      onClick={handleSkip}
                      className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
                    >
                      Skip
                    </button>
                  </div>

                  {wordResult && (
                    <div className="mb-4">
                      <div
                        className={`mb-2 text-sm font-semibold ${
                          wordResult.correct ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {wordResult.correct ? 'Correct' : 'Incorrect'}
                      </div>

                      {showAnswerImmediately && (
                        <>
                          <div className="mb-2 text-sm text-gray-800">
                            {showFullAnswer ? currentSentence : wordResult.maskedSentence}
                          </div>
                          {!wordResult.correct && wordResult.hintWord && (
                            <div className="text-sm text-gray-700">
                              Bạn có thể gõ: <span className="font-semibold">{wordResult.hintWord}</span>
                            </div>
                          )}
                        </>
                      )}

                      <div className="mt-3 space-y-1 text-sm text-gray-700">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={showAnswerImmediately}
                            onChange={(e) => setShowAnswerImmediately(e.target.checked)}
                          />
                          <span>Show answer immediately</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={showFullAnswer}
                            onChange={(e) => setShowFullAnswer(e.target.checked)}
                          />
                          <span>Show full answer</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'study' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-600">
                        Câu {currentIndex + 1} / {sentences.length}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                          disabled={currentIndex === 0}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentIndex === 0
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Trước
                        </button>
                        <button
                          onClick={() =>
                            setCurrentIndex((prev) => Math.min(sentences.length - 1, prev + 1))
                          }
                          disabled={currentIndex === sentences.length - 1}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            currentIndex === sentences.length - 1
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Tiếp
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 p-4 border border-indigo-200 rounded-lg bg-indigo-50 flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-indigo-600 uppercase mb-1">
                          Câu gốc
                        </div>
                        <div className="text-gray-900 text-lg">
                          {currentSentence}
                        </div>
                      </div>
                      <button
                        onClick={() => speakSentence(currentSentence)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex-shrink-0"
                      >
                        <FaPlay className="ml-0.5" />
                      </button>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gõ lại câu tiếng Anh
                      </label>
                      <textarea
                        value={userText}
                        onChange={(e) => setUserText(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="Nghe và gõ lại từng từ..."
                      />
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <button
                        onClick={handleCheck}
                        disabled={checking || !userText.trim()}
                        className={`px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center ${
                          checking || !userText.trim() ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {checking && (
                          <FaSpinner className="animate-spin mr-2" />
                        )}
                        Kiểm tra bằng AI
                      </button>
                    </div>

                    {checkResult && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          checkResult.correct
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {checkResult.feedback}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ảnh gợi ý ngữ cảnh (tùy chọn)
                      </label>
                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                          <FaImage className="mr-2" />
                          Chọn ảnh
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                          />
                        </label>
                        {imagePreview && (
                          <span className="text-xs text-gray-600">
                            Đã chọn một ảnh
                          </span>
                        )}
                      </div>
                      {imagePreview && (
                        <div className="mt-3">
                          <img
                            src={imagePreview}
                            alt="preview"
                            className="max-h-48 rounded-lg border"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <button
                        onClick={handleTranslate}
                        disabled={translating || !sentences.length}
                        className={`px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors flex items-center justify-center ${
                          translating || !sentences.length ? 'opacity-60 cursor-not-allowed' : ''
                        }`}
                      >
                        {translating && (
                          <FaSpinner className="animate-spin mr-2" />
                        )}
                        Dịch câu này bằng AI
                      </button>
                    </div>

                    {translation && (
                      <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                        <div className="text-xs font-semibold text-purple-700 uppercase mb-1">
                          Bản dịch
                        </div>
                        <div className="text-gray-900">
                          {translation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default DictationPage;
