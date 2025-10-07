import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { chatAPI, authAPI } from '../services/api';
import { FaVolumeUp, FaPaperPlane, FaCog, FaUndo, FaTimes } from 'react-icons/fa';
import { TextWithHoverTranslate } from './test';
import  Navbar from '../test/Nav';
import Notes from '../test/Notes';
const Dashboard = () => {



  const [topic, setTopic] = useState('daily');
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // gọi API verify token
          await authAPI.verifyToken(token); 
          navigate('/dashboard'); // nếu token hợp lệ thì cho vào dashboard
        } catch (err) {
          console.error("Token invalid or expired", err);
          localStorage.removeItem('token'); // xóa token hết hạn
          // navigate('/login');
        }
      }
    };
    checkToken();
  }, [navigate]);
  // TTS Settings
  const [ttsSettings, setTtsSettings] = useState({
    speed: 0.9,        // Tốc độ (0.1 - 2.0)
    repeat: 1,         // Số lần lặp (1 - 5)
    volume: 1,         // Âm lượng (0 - 1)
    pitch: 1,          // Cao độ (0 - 2)
    autoPlay: false,   // Tự động phát khi nhận response
    currentVoice: 'en-US' // Ngôn ngữ giọng nói
  });

  const topics = [
    { value: 'school', label: 'School Life' },
    { value: 'work', label: 'Work' },
    { value: 'daily', label: 'Daily Life' }
  ];

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };


  // Lưu vào localStorage
useEffect(() => {
  const saved = localStorage.getItem('ttsSettings');
  if (saved) setTtsSettings(JSON.parse(saved));
}, []);



  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  // Load available voices khi speechSynthesis sẵn sàng
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      }
    };

    // Load voices ngay lập tức và khi ready
    loadVoices();
    const handleVoicesChanged = () => loadVoices();
    speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  // Hàm phát giọng nói với tùy chỉnh
  const speakMessage = (text, options = {}) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt không hỗ trợ Text-to-Speech!');
      return;
    }

    // Dừng tất cả speech hiện tại
    speechSynthesis.cancel();
    
    const settings = { ...ttsSettings, ...options };
    const repeatCount = Math.max(1, Math.min(5, settings.repeat)); // Giới hạn 1-5 lần

    let repeatIndex = 0;

    const speakOnce = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Áp dụng settings
      utterance.rate = Math.max(0.1, Math.min(2.0, settings.speed));
      utterance.pitch = Math.max(0, Math.min(2.0, settings.pitch));
      utterance.volume = Math.max(0, Math.min(1.0, settings.volume));
      utterance.lang = settings.currentVoice;

      // Tìm voice phù hợp nếu có
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith(settings.currentVoice.split('-')[0])
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Events
      utterance.onstart = () => {
        console.log(`🎤 Bắt đầu phát giọng nói (lần ${repeatIndex + 1}/${repeatCount}):`, text.substring(0, 50) + '...');
        // Update UI - có thể thêm visual feedback
      };
      
      utterance.onend = () => {
        console.log(`✅ Kết thúc lần ${repeatIndex + 1}`);
        repeatIndex++;
        
        // Lặp lại nếu cần
        if (repeatIndex < repeatCount && !speechSynthesis.speaking) {
          setTimeout(speakOnce, 500); // Delay 0.5s giữa các lần lặp
        } else {
          console.log('🎉 Hoàn thành tất cả lần phát');
        }
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Lỗi phát giọng nói:', event.error, 'text:', text);
        // Có thể thử lại hoặc thông báo lỗi
      };

      speechSynthesis.speak(utterance);
    };

    // Bắt đầu phát
    speakOnce();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = { 
      id: Date.now(), 
      type: 'user', 
      text: message,
      timestamp: new Date().toLocaleTimeString()
    };
    setReplies((prev) => [...prev, userMsg]);
    const tempMessage = message;
    setMessage('');
    setLoading(true);

    try {
      const { data } = await chatAPI.sendMessage({ message: tempMessage, topic });
      const aiMsg = { 
        id: Date.now() + 1, 
        type: 'ai', 
        text: data.reply,
        timestamp: new Date().toLocaleTimeString()
      };

      setReplies((prev) => [...prev, aiMsg]);

      // Tự động phát giọng nói nếu enabled
      if (ttsSettings.autoPlay) {
        speakMessage(data.reply);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = { 
        id: Date.now() + 1, 
        type: 'error', 
        text: 'AI response failed. Please try again.',
        timestamp: new Date().toLocaleTimeString()
      };
      setReplies((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Hàm xử lý click icon loa
  const handleReplaySpeech = (text, event) => {
    event.stopPropagation();
    speakMessage(text, { 
      speed: ttsSettings.speed, 
      repeat: ttsSettings.repeat,
      volume: ttsSettings.volume,
      pitch: ttsSettings.pitch,
      currentVoice: ttsSettings.currentVoice
    });
     localStorage.setItem('ttsSettings', JSON.stringify(ttsSettings));
  };

  // Hàm reset TTS settings về mặc định
  const resetTtsSettings = () => {
    setTtsSettings({
      speed: 0.9,
      repeat: 1,
      volume: 1,
      pitch: 1,
      autoPlay: false,
      currentVoice: 'en-US'
    });
  };

  // Hàm cập nhật TTS settings
  const updateTtsSetting = (key, value) => {
    setTtsSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <>
    <Notes />
 <Navbar />
     <div className="flex h-[calc(100vh-64px)] font-sans mt-[24px]">
   

 
          {/* Sidebar */}
          <aside className="w-[280px] p-5 bg-gray-100 border-r border-gray-200 overflow-y-auto ">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-700">Luyen tap tong hop</h3>
            </div>

            {/* Topic Selection */}
            <div className="mb-5">
              <label className="block mb-2 font-semibold text-sm text-gray-700">🎯 Chủ đề giao tiếp:</label>
              <select 
                value={topic} 
                onChange={(e) => setTopic(e.target.value)} 
                className="w-full p-2.5 rounded-md border border-gray-300 bg-white text-sm cursor-pointer"
              >
                {topics.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Logout Button */}
            <div 
              className="mt-5 p-3 bg-red-100 text-red-800 rounded-lg text-center cursor-pointer border border-red-200 transition-colors hover:bg-red-200"
              onClick={logout}
            >
              🚪 Logout
            </div>

            {/* TTS Status */}
            <div className={`mt-5 p-3 rounded-md border text-xs ${'speechSynthesis' in window ? 'bg-green-100 border-green-200 text-green-800' : 'bg-red-100 border-red-200 text-red-800'}`}>
              <strong>TTS Status:</strong><br/>
              {'speechSynthesis' in window ? '✅ Được hỗ trợ' : '❌ Không hỗ trợ'}
              {'speechSynthesis' in window && (
                <div className="mt-1 text-[11px] opacity-80">
                  Voices loaded: {speechSynthesis.getVoices().length}
                </div>
              )}
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className="flex-1 flex flex-col">
            {/* Header */}
            <header className="p-5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">🤖 AI Conversation Assistant</h1>
                  <p className="mt-1 opacity-90 text-sm">
                    Chủ đề: <strong>{topics.find(t => t.value === topic)?.label}</strong>
                    {ttsSettings.autoPlay && <span className="ml-3 px-2 py-1 bg-white/20 rounded-full text-xs">🔊 Auto-play ON</span>}
                  </p>
                </div>
                <div 
                  className="p-2 bg-white/20 rounded-full cursor-pointer hover:bg-white/30 transition-all"
                 
                  title="TTS Settings"
                >
                  <FaCog size={18}  onClick={() => setShowTtsSettings(!showTtsSettings)} />
                  {/* TTS Settings Panel */}
              {showTtsSettings && (
                <div className="absolute right-[22px] mt-2 bg-white text-gray-800 rounded-lg p-4 border border-gray-200 shadow-lg z-50 min-w-[200px]">
                  <h4 className="mb-4 text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">🎚️ Điều chỉnh giọng nói</h4>

                  {/* Speed Control */}
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-medium">Tốc độ phát: {ttsSettings.speed.toFixed(1)}x</label>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={ttsSettings.speed}
                      onChange={(e) => updateTtsSetting('speed', parseFloat(e.target.value))}
                      className="w-full h-1 rounded bg-gray-200 outline-none appearance-none"
                    />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>Chậm (0.1x)</span>
                      <span>Nhanh (2.0x)</span>
                    </div>
                  </div>

                  {/* Repeat Control */}
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-medium">Số lần lặp: {ttsSettings.repeat}x</label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={ttsSettings.repeat}
                      onChange={(e) => updateTtsSetting('repeat', parseInt(e.target.value))}
                      className="w-full h-1 rounded bg-gray-200 outline-none appearance-none"
                    />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>1 lần</span>
                      <span>5 lần</span>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-medium">Âm lượng: {(ttsSettings.volume * 100).toFixed(0)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={ttsSettings.volume}
                      onChange={(e) => updateTtsSetting('volume', parseFloat(e.target.value))}
                      className="w-full h-1 rounded bg-gray-200 outline-none appearance-none"
                    />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>Tắt tiếng</span>
                      <span>To nhất</span>
                    </div>
                  </div>

                  {/* Pitch Control */}
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-medium">Cao độ: {ttsSettings.pitch.toFixed(1)}</label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={ttsSettings.pitch}
                      onChange={(e) => updateTtsSetting('pitch', parseFloat(e.target.value))}
                      className="w-full h-1 rounded bg-gray-200 outline-none appearance-none"
                    />
                    <div className="flex justify-between text-[11px] text-gray-600 mt-1">
                      <span>Thấp</span>
                      <span>Cao</span>
                    </div>
                  </div>

                  {/* Voice Selection */}
                  <div className="mb-4">
                    <label className="block mb-1 text-xs font-medium">Ngôn ngữ:</label>
                    <select
                      value={ttsSettings.currentVoice}
                      onChange={(e) => updateTtsSetting('currentVoice', e.target.value)}
                      className="w-full p-2 rounded border border-gray-300 bg-white text-xs"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="vi-VN">Tiếng Việt</option>
                      <option value="es-ES">Español</option>
                      <option value="fr-FR">Français</option>
                    </select>
                  </div>

                  {/* Auto-play Toggle */}
                  <div className={`flex items-center mb-4 p-2 rounded border ${ttsSettings.autoPlay ? 'bg-green-100 border-green-200' : 'bg-gray-100 border-gray-200'}`}>
                    <input
                      type="checkbox"
                      checked={ttsSettings.autoPlay}
                      onChange={(e) => updateTtsSetting('autoPlay', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-700">🔄 Tự động phát khi nhận response</span>
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={resetTtsSettings}
                    className="w-full p-2 bg-gray-500 text-white rounded flex items-center justify-center gap-1.5 text-xs hover:bg-gray-600"
                  >
                    <FaUndo size={12} />
                    Reset về mặc định
                  </button>
                </div>
              )}
                </div>
                
              </div>

              
            </header>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 bg-gray-100">
              {replies.length === 0 ? (
                <div className="text-center text-gray-600 mt-12 text-base">
                  <div className="text-6xl mb-4 opacity-50">💬</div>
                  <p className="mb-2">Chào mừng bạn đến với AI Chat!</p>
                  <p className="mb-5 text-sm">Nhập tin nhắn và nhấn Enter để bắt đầu cuộc trò chuyện.</p>
                  <div className="inline-block px-5 py-2 bg-white rounded-full shadow">
                    <strong>Chủ đề hiện tại:</strong> {topics.find(t => t.value === topic)?.label}
                  </div>
                  <div className="mt-5 text-xs opacity-70">
                    💡 Mẹo: Click icon loa 🔊 để phát lại với settings tùy chỉnh
                  </div>
                </div>
              ) : (
                replies.map((reply) => (
                  <div 
                    key={reply.id} 
                    className={`mb-5 flex ${reply.type === 'user' ? 'justify-end' : 'justify-start'} items-end`}
                  >
                    <div className="max-w-[75%] break-words">
                      <div className={`p-3.5 rounded-2xl ${reply.type === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white' : 'bg-white text-gray-900'} shadow-lg border border-gray-100 ${reply.type === 'user' ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                        <div className={`mb-${reply.type === 'ai' ? '2.5' : '0'} leading-relaxed text-sm`}>
                          {reply.text}
                        </div>
                        {reply.type === 'ai' && (
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-[11px]">{reply.timestamp}</span>
                              <span className="text-[11px] opacity-70">• {ttsSettings.speed.toFixed(1)}x • {ttsSettings.repeat}x</span>
                            </div>
                            <button
                              onClick={(e) => handleReplaySpeech(reply.text, e)}
                              title={`Phát lại (${ttsSettings.repeat}x, ${ttsSettings.speed.toFixed(1)}x)`}
                              className="bg-blue-100 border border-blue-200 p-1.5 rounded-xl flex items-center gap-1 text-xs font-medium hover:bg-blue-200 transition-all hover:scale-105"
                            >
                              <FaVolumeUp size={14} className="text-blue-500" />
                              <span>Play</span>
                            </button>
                          </div>
                        )}
                        {reply.type === 'user' && (
                          <div className="text-right text-xs text-white/80 mt-2 pt-2 border-t border-white/10">
                            {reply.timestamp}
                          </div>
                        )}
                        {reply.type === 'error' && (
                          <div className="bg-red-100 text-red-800 border-red-200 rounded-lg border p-2 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <strong className="text-xs">Lỗi:</strong>
                            <span className="text-xs">{reply.text}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start mb-5">
                  <div className="p-3.5 bg-gray-200 rounded-2xl rounded-bl-md max-w-[75%] border border-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-700">AI đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-5 border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
              <div className="flex items-end gap-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`💭 Nhập tin nhắn về ${topics.find(t => t.value === topic)?.label}... (Enter để gửi, Shift+Enter để xuống dòng)`}
                  className="flex-1 p-3.5 rounded-full border border-gray-300 resize-none text-sm leading-relaxed max-h-32 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-sans min-h-[56px]"
                  rows={1}
                  disabled={loading}
                />
                <button 
                  type="submit" 
                  disabled={loading || !message.trim()} 
                  className={`w-14 h-14 rounded-full border-none flex items-center justify-center transition-all shadow-lg ${loading || !message.trim() ? 'bg-gray-500 cursor-not-allowed' : ttsSettings.autoPlay ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                  title={ttsSettings.autoPlay ? "Gửi & tự động phát âm" : "Gửi tin nhắn"}
                >
                  {loading ? (
                    <div className="w-4.5 h-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <FaPaperPlane size={18} className="rotate-[-45deg]" />
                  )}
                </button>
              </div>
              {ttsSettings.autoPlay && (
                <div className="mt-2 p-1.5 bg-green-100 rounded-full text-xs text-green-800 flex items-center gap-2">
                  <FaVolumeUp size={12} />
                  <span>Tự động phát với {ttsSettings.speed.toFixed(1)}x, {ttsSettings.repeat}x lần</span>
                  <button
                    onClick={() => updateTtsSetting('autoPlay', false)}
                    className="ml-auto bg-none border-none text-inherit cursor-pointer p-0 w-4 h-4"
                    title="Tắt auto-play"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )}
            </form>
          </main>

          <style jsx>{`
            /* Custom range input thumb */
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            /* Custom scrollbar */
            ::-webkit-scrollbar {
              width: 6px;
            }
            ::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 3px;
            }
            ::-webkit-scrollbar-thumb {
              background: #c1c1c1;
              border-radius: 3px;
            }
            ::-webkit-scrollbar-thumb:hover {
              background: #a8a8a8;
            }
          `}</style>
        </div>
    </>

      
  );
};

export default Dashboard;