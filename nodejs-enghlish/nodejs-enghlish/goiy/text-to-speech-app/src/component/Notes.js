import React, { useState, useEffect, useCallback } from "react";
// import { useNavigate } from "react-router-dom";
import { AiFillSignature } from "react-icons/ai";
import { AiOutlinePlus } from "react-icons/ai";
import { notesAPI } from '../services/api';
import { jwtDecode } from 'jwt-decode';
const Notes = () => {
  const [open, setOpen] = useState(false);
  // const [note, setNote] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 600 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const [original, setOriginal] = useState("");
  const [translate, setTranslate] = useState("");

  // const navigate = useNavigate();
  // const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;


  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // chỉ kéo bằng chuột trái
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,

    });

  };

  const handleMouseMove = useCallback((e) => {
    if (dragging) {
      // Kích thước nút (đường kính = 48px ~ 12 * 4)
      const buttonSize = 48;
      const padding = 8; // chừa một khoảng an toàn

      // Giới hạn trong khung nhìn
      const maxX = window.innerWidth - buttonSize - padding;
      const maxY = window.innerHeight - buttonSize - padding;

      const newX = Math.min(Math.max(e.clientX - offset.x, padding), maxX);
      const newY = Math.min(Math.max(e.clientY - offset.y, padding), maxY);

      setPosition({ x: newX, y: newY });
    }
  }, [dragging, offset]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // const handleSubmit = () => {
  //   console.log("Ghi chú:", position.x, position.y);
  //   alert("chức năng này chưa được phát triển!");
  //   setOpen(false);
  // }
  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // chọn file ảnh
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
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

      let imageUrl = "";
  
      // Nếu có ảnh → upload lên Cloudinary
      if (image) {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("upload_preset", uploadPreset); // 👈 preset bạn tạo

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/dk40jam2m/image/upload",
          {
            method: "POST",
            body: formData,
          }
        );
        const data = await res.json();
        imageUrl = data.secure_url; // ✅ Đường dẫn ảnh trên Cloudinary
      }

      // Gửi URL đến server
      const body = {
        user_id,
        original,
        translate,
        image: imageUrl,
      };

      const resNote = await notesAPI.create(body);

      if (resNote.data) {
        alert("✅ Ghi chú đã được lưu!");
        setOpen(false);
        setOriginal("");
        setTranslate("");
        setImage(null);
      }
    } catch (err) {
      console.error("Lỗi khi lưu ghi chú:", err);
      alert("❌ Lưu thất bại!");
    }
  };


  return (
    <>
      {/* Icon hình tròn */}
      <div
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (!dragging) setOpen(!open);
        }}
        style={{
          position: "fixed",
          top: position.y,
          left: position.x,
          cursor: dragging ? "grabbing" : "grab",
          zIndex: 50,
        }}
        className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg text-white select-none"
      >
        <AiFillSignature />
      </div>

      {/* Popup ghi chú hiển thị theo vị trí icon */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: position.y - 220, // popup nằm trên icon
            left: position.x + 60, // popup lệch sang phải
            zIndex: 100,
          }}
          className="bg-white p-4 shadow-lg rounded-lg border "
        >
          <h3 className="font-bold mb-2">Ghi chú</h3>
          <div className="flex gap-2 mb-3">
            <input
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="Nhập original..."
              className="border rounded p-2 h-7 flex-1"
            />
            <input
              value={translate}
              onChange={(e) => setTranslate(e.target.value)}
              placeholder="Nhập translate..."
              className="border rounded p-2 h-7 flex-1"
            />

          </div>

          {/* Vùng thêm ảnh */}
          <div className="mb-3">
            {image ? (
              <img
                src={image}
                alt="preview"
                className="w-full h-32 object-scale rounded border"
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
            lưu
          </button>
        </div>
      )}
    </>
  );
};

export default Notes;

