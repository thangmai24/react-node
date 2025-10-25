import React, { useState, useEffect } from "react";
import { BookOpen, Languages, Plus, Trash2, Edit2, Image, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { notesAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';

import  Navbar from '../component/Nav';
export default function NotesApp() {
  const [notes, setNotes] = useState([

  ]);
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        let user_id = null;
        const token = localStorage.getItem("token");
        if (token) {
          const decoded = jwtDecode(token);
          user_id = decoded.id;
        }

        if (!user_id) {
          alert("Chưa đăng nhập!");
          return;
        }

        const resNote = await notesAPI.getAll({ user_id });
        console.log("resNote:", resNote);

        // Nếu API trả về danh sách notes trong resNote.data:
        const formattedNotes = resNote.data.map((note) => ({
          id: note._id,
          original: note.original || "",
          translate: note.translate || "",
          img: note.image && note.image.startsWith('http')
            ? note.image
            : "image/logo.png"

        }));
        setNotes(formattedNotes);
      } catch (err) {
        console.error("Lỗi khi lấy notes:", err);
      }
    };

    fetchNotes();
  }, []);

  const [displaySettings, setDisplaySettings] = useState({
    showImage: true,
    showOriginal: true,
    showTranslate: true
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [formData, setFormData] = useState({
    original: '',
    translate: '',
    img: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    if (!formData.original || !formData.translate || !formData.img) {
      return;
    }

    if (editingId) {
      setNotes(notes.map(note =>
        note.id === editingId
          ? { ...note, ...formData }
          : note
      ));
      setEditingId(null);
    } else {
      const newNote = {
        id: Date.now(),
        ...formData
      };
      setNotes([...notes, newNote]);
    }

    setFormData({ original: '', translate: '', img: '' });
    setIsAdding(false);
  };

  const handleEdit = (note) => {
    setEditingId(note.id);
    setFormData({
      original: note.original,
      translate: note.translate,
      img: note.img
    });
    setIsAdding(true);
  };

  const handleDelete = (id) => {
    setNotes(notes.filter(note => note.id !== id));
    if (currentSlide >= notes.length - 1) {
      setCurrentSlide(Math.max(0, notes.length - 2));
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ original: '', translate: '', img: '' });
  };

  const toggleSetting = (setting) => {
    setDisplaySettings({
      ...displaySettings,
      [setting]: !displaySettings[setting]
    });
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % notes.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + notes.length) % notes.length);
  };

  return (
    <>
      <Navbar />
       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Ghi Chú Của Tôi</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Settings className="w-5 h-5" />
                Cài đặt
              </button>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Thêm
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-indigo-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Hiển thị nội dung</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displaySettings.showImage}
                    onChange={() => toggleSetting('showImage')}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <Image className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Hiển thị hình ảnh</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displaySettings.showOriginal}
                    onChange={() => toggleSetting('showOriginal')}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <BookOpen className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Hiển thị bản gốc</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={displaySettings.showTranslate}
                    onChange={() => toggleSetting('showTranslate')}
                    className="w-5 h-5 text-indigo-600 rounded"
                  />
                  <Languages className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">Hiển thị bản dịch</span>
                </label>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">
                {editingId ? 'Chỉnh Sửa' : 'Thêm Mới'}
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Văn bản gốc
                </label>
                <textarea
                  name="original"
                  value={formData.original}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bản dịch
                </label>
                <textarea
                  name="translate"
                  value={formData.translate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Hình ảnh
                </label>
                <input
                  type="text"
                  name="img"
                  value={formData.img}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Cập Nhật' : 'Lưu'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {notes.length > 0 && (
          <>
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Image className="w-6 h-6 text-indigo-600" />
                Carousel
              </h2>
              <div className="relative">
                <div className="overflow-hidden rounded-xl">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                    {notes.map((note) => (
                      <div key={note.id} className="w-full flex-shrink-0">
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl overflow-hidden">
                          <div className="h-80 overflow-hidden relative ">
                            <h2 className='absolute inset-0 -z-10 flex justify-center items-center text-4xl border border-white'>hidden</h2>
                            {displaySettings.showImage && note.img && (
                              console.log("note.img:", note.img),
                              <img
                                src={note.img}
                                alt="Note"
                                className="w-full h-full object-contain"
                              />

                            )}
                          </div>

                          <div className="p-8">
                            {displaySettings.showOriginal && (
                              <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                  <BookOpen className="w-6 h-6 text-gray-600" />
                                  <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                    Bản gốc
                                  </span>
                                </div>
                                <p className="text-xl text-gray-800 leading-relaxed">{note.original}</p>
                              </div>
                            )}

                            {displaySettings.showTranslate && (
                              <div className={displaySettings.showOriginal ? "pt-6 border-t-2 border-indigo-200" : ""}>
                                <div className="flex items-center gap-2 mb-3">
                                  <Languages className="w-6 h-6 text-indigo-600" />
                                  <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                                    Bản dịch
                                  </span>
                                </div>
                                <p className="text-xl text-gray-700 leading-relaxed">{note.translate}</p>
                              </div>
                            )}

                            <div className="flex gap-2 mt-6 pt-6 border-t-2 border-gray-200">
                              <button
                                onClick={() => handleEdit(note)}
                                className="flex items-center gap-2 flex-1 justify-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDelete(note.id)}
                                className="flex items-center gap-2 flex-1 justify-center bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Xóa
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {notes.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
                    >
                      <ChevronLeft className="w-6 h-6 text-gray-700" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white rounded-full p-3 shadow-lg hover:bg-gray-100 transition-colors z-10"
                    >
                      <ChevronRight className="w-6 h-6 text-gray-700" />
                    </button>
                  </>
                )}

                <div className="flex justify-center gap-2 mt-6">
                  {notes.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all ${currentSlide === index
                        ? 'bg-indigo-600 w-8'
                        : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Lưới</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                >
                  {displaySettings.showImage && note.img && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={note.img}
                        alt="Note"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2">
                        <Image className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {displaySettings.showOriginal && (
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="w-5 h-5 text-gray-600" />
                          <span className="text-sm font-semibold text-gray-600 uppercase">
                            Bản gốc
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{note.original}</p>
                      </div>
                    )}

                    {displaySettings.showTranslate && (
                      <div className={displaySettings.showOriginal ? "pt-4 border-t border-gray-200" : ""}>
                        <div className="flex items-center gap-2 mb-2">
                          <Languages className="w-5 h-5 text-indigo-600" />
                          <span className="text-sm font-semibold text-indigo-600 uppercase">
                            Bản dịch
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">{note.translate}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleEdit(note)}
                        className="flex items-center gap-2 flex-1 justify-center bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="flex items-center gap-2 flex-1 justify-center bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {notes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Chưa có ghi chú. Hãy thêm ghi chú đầu tiên!</p>
          </div>
        )}
      </div>
    </div>
    </>
   
  );
}