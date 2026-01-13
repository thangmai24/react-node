import React, { useState, useEffect, useCallback } from "react";
import { AiFillSignature } from "react-icons/ai";
import { AiOutlinePlus } from "react-icons/ai";
import { notesAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';

const Notes = () => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 600 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const [original, setOriginal] = useState("");
  const [translate, setTranslate] = useState("");

  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  const isMobile = window.innerWidth < 768; // kích thước mobile

  // ------- DESKTOP DRAG -------- //
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);

    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (dragging) {
        const size = isMobile ? 36 : 48;
        const padding = 8;
        const maxX = window.innerWidth - size - padding;
        const maxY = window.innerHeight - size - padding;

        const newX = Math.min(Math.max(e.clientX - offset.x, padding), maxX);
        const newY = Math.min(Math.max(e.clientY - offset.y, padding), maxY);

        setPosition({ x: newX, y: newY });
      }
    },
    [dragging, offset, isMobile]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // ------- MOBILE DRAG (TOUCH) -------- //
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setDragging(true);

    setOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = useCallback((e) => {
    if (!dragging) return;

    const touch = e.touches[0];

    const size = isMobile ? 36 : 48;
    const padding = 8;
    const maxX = window.innerWidth - size - padding;
    const maxY = window.innerHeight - size - padding;

    const newX = Math.min(Math.max(touch.clientX - offset.x, padding), maxX);
    const newY = Math.min(Math.max(touch.clientY - offset.y, padding), maxY);

    setPosition({ x: newX, y: newY });
  }, [dragging, offset, isMobile]);

  const handleTouchEnd = useCallback(() => setDragging(false), []);

  // Add desktop events
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleTouchEnd);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ---- Upload ảnh ---- //
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    try {
      let user_id = null;
      const token = localStorage.getItem("token");

      if (token) {
        user_id = jwtDecode(token).id;
      }

      if (!user_id) {
        alert("Chưa đăng nhập!");
        return;
      }

      let imageUrl = "";

      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dk40jam2m/image/upload",
          { method: "POST", body: formData }
        );

        const data = await res.json();
        imageUrl = data.secure_url;
      }

      const resNote = await notesAPI.create({
        user_id,
        original,
        translate,
        image: imageUrl,
      });

      if (resNote.data) {
        alert("Đã lưu ghi chú!");
        setOpen(false);
        setOriginal("");
        setTranslate("");
        setImage(null);
      }
    } catch (err) {
      alert("Lỗi khi lưu!");
      console.error(err);
    }
  };

  return (
    <>
      {/* Floating Icon */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={() => !dragging && setOpen(!open)}
        style={{
          position: "fixed",
          top: position.y,
          left: position.x,
          cursor: dragging ? "grabbing" : "grab",
          zIndex: 50,
        }}
        className={`${isMobile ? "w-9 h-9" : "w-12 h-12"
          } bg-yellow-500 rounded-full flex items-center justify-center shadow-lg text-white select-none`}
      >
        <AiFillSignature size={isMobile ? 18 : 24} />
      </div>

      {/* Popup */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: position.y - 220,
            left: position.x + (isMobile ? 40 : 60),
            zIndex: 100,
          }}
          className="bg-white p-4 shadow-lg rounded-lg border w-60"
        >
          <h3 className="font-bold mb-2">Ghi chú</h3>

          <div className={`flex mb-3 ${isMobile ? "flex-col gap-2" : "flex-col gap-2"}`}>
            <input
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="Original..."
              className="border rounded p-2 h-7 flex-1"
            />

            <input
              value={translate}
              onChange={(e) => setTranslate(e.target.value)}
              placeholder="Translate..."
              className="border rounded p-2 h-7 flex-1"
            />
          </div>

          {/* Upload Image */}
          <div className="mb-3">
            {image ? (
              <img
                src={image}
                alt="preview"
                className="w-full h-32 object-cover rounded border"
              />
            ) : (
              <label
                htmlFor="upload"
                className="w-full h-32 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
              >
                <AiOutlinePlus size={30} className="text-gray-500" />
                <span className="text-sm text-gray-500">Thêm hình</span>
              </label>
            )}
            <input
              type="file"
              id="upload"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-1 rounded"
          >
            Lưu
          </button>
        </div>
      )}
    </>
  );
};

export default Notes;
