import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import { FaVolumeUp, FaPaperPlane, FaCog, FaUndo, FaTimes } from 'react-icons/fa';

const Dashboard = () => {
  const [topic, setTopic] = useState('daily');
  const [message, setMessage] = useState('');
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTtsSettings, setShowTtsSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
    <div style={{ display: 'flex', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        padding: '20px', 
        background: '#f8f9fa',
        borderRight: '1px solid #dee2e6',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '10px',
          borderBottom: '1px solid #dee2e6'
        }}>
          <h3 style={{ margin: 0, color: '#495057', fontSize: '18px' }}>
            ⚙️ Settings
          </h3>
        </div>

        {/* Topic Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '600', 
            fontSize: '14px',
            color: '#495057'
          }}>
            🎯 Chủ đề giao tiếp:
          </label>
          <select 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)} 
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #ced4da',
              backgroundColor: 'white',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {topics.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* TTS Settings Toggle */}
        <div 
          style={{ 
            marginBottom: '15px',
            padding: '12px',
            background: '#e3f2fd',
            borderRadius: '8px',
            cursor: 'pointer',
            border: '1px solid #bbdefb',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setShowTtsSettings(!showTtsSettings)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaVolumeUp size={16} style={{ marginRight: '8px', color: '#1976d2' }} />
              <span style={{ fontWeight: '600', color: '#1976d2' }}>TTS Settings</span>
            </div>
            <span style={{ 
              color: showTtsSettings ? '#1976d2' : '#6c757d',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              {showTtsSettings ? '▲ Thu gọn' : '▼ Mở rộng'}
            </span>
          </div>
        </div>

        {/* TTS Settings Panel */}
        {showTtsSettings && (
          <div style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid #dee2e6',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              margin: '0 0 15px 0', 
              fontSize: '14px', 
              color: '#495057',
              borderBottom: '1px solid #eee',
              paddingBottom: '8px'
            }}>
              🎚️ Điều chỉnh giọng nói
            </h4>

            {/* Speed Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                Tốc độ phát: {ttsSettings.speed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={ttsSettings.speed}
                onChange={(e) => updateTtsSetting('speed', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#ddd',
                  outline: 'none',
                  '-webkit-appearance': 'none'
                }}
                onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, #007bff 0%, #007bff ' + ((ttsSettings.speed - 0.1) / 1.9 * 100) + '%, #ddd ' + ((ttsSettings.speed - 0.1) / 1.9 * 100) + '%)'}
                onMouseOut={(e) => e.target.style.background = '#ddd'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                <span>Chậm (0.1x)</span>
                <span>Nhanh (2.0x)</span>
              </div>
            </div>

            {/* Repeat Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                Số lần lặp: {ttsSettings.repeat}x
              </label>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={ttsSettings.repeat}
                onChange={(e) => updateTtsSetting('repeat', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#ddd',
                  outline: 'none',
                  '-webkit-appearance': 'none'
                }}
                onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, #28a745 0%, #28a745 ' + ((ttsSettings.repeat - 1) / 4 * 100) + '%, #ddd ' + ((ttsSettings.repeat - 1) / 4 * 100) + '%)'}
                onMouseOut={(e) => e.target.style.background = '#ddd'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                <span>1 lần</span>
                <span>5 lần</span>
              </div>
            </div>

            {/* Volume Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                Âm lượng: {(ttsSettings.volume * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={ttsSettings.volume}
                onChange={(e) => updateTtsSetting('volume', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#ddd',
                  outline: 'none',
                  '-webkit-appearance': 'none'
                }}
                onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, #dc3545 0%, #dc3545 ' + (ttsSettings.volume * 100) + '%, #ddd ' + (ttsSettings.volume * 100) + '%)'}
                onMouseOut={(e) => e.target.style.background = '#ddd'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                <span>Tắt tiếng</span>
                <span>To nhất</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                Cao độ: {ttsSettings.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={ttsSettings.pitch}
                onChange={(e) => updateTtsSetting('pitch', parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#ddd',
                  outline: 'none',
                  '-webkit-appearance': 'none'
                }}
                onMouseOver={(e) => e.target.style.background = 'linear-gradient(to right, #ffc107 0%, #ffc107 ' + (ttsSettings.pitch * 50) + '%, #ddd ' + (ttsSettings.pitch * 50) + '%)'}
                onMouseOut={(e) => e.target.style.background = '#ddd'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>
                <span>Thấp</span>
                <span>Cao</span>
              </div>
            </div>

            {/* Voice Selection */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: '500' }}>
                Ngôn ngữ:
              </label>
              <select
                value={ttsSettings.currentVoice}
                onChange={(e) => updateTtsSetting('currentVoice', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #ced4da',
                  backgroundColor: 'white',
                  fontSize: '13px'
                }}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="vi-VN">Tiếng Việt</option>
                <option value="es-ES">Español</option>
                <option value="fr-FR">Français</option>
              </select>
            </div>

            {/* Auto-play Toggle */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '15px',
              padding: '8px',
              background: ttsSettings.autoPlay ? '#d4edda' : '#f8f9fa',
              borderRadius: '6px',
              border: `1px solid ${ttsSettings.autoPlay ? '#c3e6cb' : '#dee2e6'}`
            }}>
              <input
                type="checkbox"
                checked={ttsSettings.autoPlay}
                onChange={(e) => updateTtsSetting('autoPlay', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '13px', color: '#495057' }}>
                🔄 Tự động phát khi nhận response
              </span>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetTtsSettings}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FaUndo size={12} />
              Reset về mặc định
            </button>
          </div>
        )}

        {/* Logout Button */}
        <div style={{ 
          marginTop: '20px',
          padding: '15px',
          background: '#f8d7da',
          color: '#721c24',
          borderRadius: '8px',
          textAlign: 'center',
          cursor: 'pointer',
          border: '1px solid #f5c6cb',
          transition: 'all 0.2s ease'
        }} 
        onClick={logout}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#f5c6cb';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#f8d7da';
        }}
        >
          🚪 Logout
        </div>

        {/* TTS Status */}
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          background: ('speechSynthesis' in window) ? '#d4edda' : '#f8d7da',
          borderRadius: '6px',
          border: `1px solid ${('speechSynthesis' in window) ? '#c3e6cb' : '#f5c6cb'}`,
          fontSize: '12px',
          color: ('speechSynthesis' in window) ? '#155724' : '#721c24'
        }}>
          <strong>TTS Status:</strong><br/>
          {('speechSynthesis' in window) ? '✅ Được hỗ trợ' : '❌ Không hỗ trợ'}
          {('speechSynthesis' in window) && (
            <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
              Voices loaded: {speechSynthesis.getVoices().length}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px' }}>
                🤖 AI Conversation Assistant
              </h1>
              <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                Chủ đề: <strong>{topics.find(t => t.value === topic)?.label}</strong>
                {ttsSettings.autoPlay && <span style={{ marginLeft: '15px', padding: '2px 6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '12px' }}>🔊 Auto-play ON</span>}
              </p>
            </div>
            <div style={{ 
              padding: '8px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '50%', 
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setShowTtsSettings(!showTtsSettings)}
            title="TTS Settings"
            >
              <FaCog size={18} />
            </div>
          </div>
        </header>

        {/* Messages Container */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          {replies.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#6c757d', 
              marginTop: '50px',
              fontSize: '16px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '15px', opacity: 0.5 }}>💬</div>
              <p style={{ marginBottom: '10px' }}>Chào mừng bạn đến với AI Chat!</p>
              <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                Nhập tin nhắn và nhấn Enter để bắt đầu cuộc trò chuyện.
              </p>
              <div style={{ 
                padding: '10px 20px', 
                background: 'white', 
                borderRadius: '20px', 
                display: 'inline-block',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <strong>Chủ đề hiện tại:</strong> {topics.find(t => t.value === topic)?.label}
              </div>
              <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.7 }}>
                💡 Mẹo: Click icon loa 🔊 để phát lại với settings tùy chỉnh
              </div>
            </div>
          ) : (
            replies.map((reply) => (
              <div 
                key={reply.id} 
                style={{ 
                  marginBottom: '20px', 
                  display: 'flex',
                  justifyContent: reply.type === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  wordWrap: 'break-word'
                }}>
                  {/* Bubble container */}
                  <div style={{
                    padding: '14px 18px',
                    borderRadius: '20px',
                    background: reply.type === 'user' 
                      ? 'linear-gradient(135deg, #007bff, #0056b3)' 
                      : 'white',
                    color: reply.type === 'user' ? 'white' : '#212529',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    position: 'relative',
                    borderBottomRightRadius: reply.type === 'user' ? '6px' : '20px',
                    borderBottomLeftRadius: reply.type === 'ai' ? '6px' : '20px',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}>
                    {/* Content */}
                    <div style={{ 
                      marginBottom: reply.type === 'ai' ? '10px' : '0',
                      lineHeight: '1.5',
                      fontSize: '14px'
                    }}>
                      {reply.text}
                    </div>
                    
                    {/* AI-specific: Footer với timestamp + Speaker controls */}
                    {reply.type === 'ai' && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '12px',
                          color: '#6c757d'
                        }}>
                          <span style={{ fontSize: '11px' }}>
                            {reply.timestamp}
                          </span>
                          <span style={{ fontSize: '11px', opacity: 0.7 }}>
                            • {ttsSettings.speed.toFixed(1)}x • {ttsSettings.repeat}x
                          </span>
                        </div>
                        
                        {/* Speaker Button với visual feedback */}
                        <button
                          onClick={(e) => handleReplaySpeech(reply.text, e)}
                          title={`Phát lại (${ttsSettings.repeat}x, ${ttsSettings.speed.toFixed(1)}x)`}
                          style={{
                            background: 'rgba(0,123,255,0.1)',
                            border: '1px solid rgba(0,123,255,0.2)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease',
                            fontSize: '12px'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'rgba(0,123,255,0.2)';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(0,123,255,0.1)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          <FaVolumeUp size={14} style={{ color: '#007bff' }} />
                          <span style={{ fontWeight: '500' }}>Play</span>
                        </button>
                      </div>
                    )}
                    
                    {/* User: Chỉ timestamp */}
                    {reply.type === 'user' && (
                      <div style={{ 
                        textAlign: 'right',
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.8)',
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {reply.timestamp}
                      </div>
                    )}
                    
                    {/* Error message styling */}
                    {reply.type === 'error' && (
                      <div style={{ 
                        backgroundColor: '#f8d7da !important',
                        color: '#721c24 !important',
                        border: '1px solid #f5c6cb !important',
                        borderRadius: '8px !important'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '8px 0'
                        }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            background: '#dc3545', 
                            borderRadius: '50%' 
                          }}></div>
                          <strong style={{ fontSize: '13px' }}>Lỗi:</strong>
                          <span style={{ fontSize: '13px' }}>{reply.text}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Loading indicator */}
          {loading && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start', 
              marginBottom: '20px' 
            }}>
              <div style={{
                padding: '14px 18px',
                background: '#e9ecef',
                borderRadius: '20px',
                borderBottomLeftRadius: '6px',
                maxWidth: '75%',
                position: 'relative',
                border: '1px solid #dee2e6'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #dee2e6',
                    borderTop: '2px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '14px', color: '#495057' }}>
                    AI đang suy nghĩ...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ 
          padding: '20px', 
          borderTop: '1px solid #dee2e6',
          backgroundColor: 'white',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`💭 Nhập tin nhắn về ${topics.find(t => t.value === topic)?.label}... (Enter để gửi, Shift+Enter để xuống dòng)`}
              style={{ 
                flex: 1, 
                padding: '14px 18px', 
                borderRadius: '25px', 
                border: '1px solid #ced4da',
                resize: 'none',
                fontSize: '14px',
                lineHeight: '1.5',
                maxHeight: '120px',
                outline: 'none',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              rows={1}
              disabled={loading}
              onFocus={(e) => {
                e.target.style.borderColor = '#007bff';
                e.target.style.boxShadow = '0 0 0 0.2rem rgba(0,123,255,0.25)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ced4da';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button 
              type="submit" 
              disabled={loading || !message.trim()} 
              style={{ 
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: loading || !message.trim() ? '#6c757d' : 
                               ttsSettings.autoPlay ? '#28a745' : '#007bff',
                color: 'white',
                cursor: loading || !message.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              title={ttsSettings.autoPlay ? "Gửi & tự động phát âm" : "Gửi tin nhắn"}
            >
              {loading ? (
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              ) : (
                <FaPaperPlane size={18} style={{ transform: 'rotate(-45deg)' }} />
              )}
            </button>
          </div>
          
          {/* Settings preview */}
          {ttsSettings.autoPlay && (
            <div style={{ 
              marginTop: '8px', 
              padding: '6px 12px', 
              background: 'rgba(40,167,69,0.1)', 
              borderRadius: '20px', 
              fontSize: '12px', 
              color: '#155724',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FaVolumeUp size={12} />
              <span>Tự động phát với {ttsSettings.speed.toFixed(1)}x, {ttsSettings.repeat}x lần</span>
              <button
                onClick={() => updateTtsSetting('autoPlay', false)}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 0,
                  width: '16px',
                  height: '16px'
                }}
                title="Tắt auto-play"
              >
                <FaTimes size={12} />
              </button>
            </div>
          )}
        </form>
      </main>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #007bff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        textarea {
          min-height: 56px;
          overflow-y: auto;
        }
        
        textarea:focus {
          border-color: #007bff !important;
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) !important;
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
  );
};

export default Dashboard;