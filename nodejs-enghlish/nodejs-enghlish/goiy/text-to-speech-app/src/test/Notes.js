import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillSignature } from "react-icons/ai";
import { AiOutlinePlus } from "react-icons/ai";

const Notes = () => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(null);
  const [position, setPosition] = useState({ x: 100, y: 600 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);

  const navigate = useNavigate();

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // chỉ kéo bằng chuột trái
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
      
    });

  };

  const handleMouseMove = (e) => {
    if (dragging) {
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleSubmit = () => {
    console.log("Ghi chú:", position.x, position.y);
    alert("chức năng này chưa được phát triển!");
    setOpen(false);
  }
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
  }, [dragging]);

  // chọn file ảnh
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result);
      reader.readAsDataURL(file);
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
              value={note || ""}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú..."
              className="border rounded p-2 h-7 flex-1"
            />
            <input
              value={note || ""}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú..."
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

