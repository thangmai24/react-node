const { validationResult } = require('express-validator');
const Note = require('../models/Notes');
const cloudinary = require('cloudinary').v2;

// ✅ CREATE - Đã sửa lỗi Duplicate và Rò rỉ Ảnh
const createNote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ msg: errors.array()[0].msg });

  const { translate, original, image } = req.body;

  // Tinh chỉnh: Dùng một public_id dự kiến ban đầu, hoặc tạo mới sau
  // Tuy nhiên, việc tạo public_id dựa trên Date.now() trước khi kiểm tra vẫn ổn
  const public_id_base = `note_${req.user._id}_${Date.now()}`;

  try {
    // --- BƯỚC 1: KIỂM TRA DUPLICATE (Không bắt buộc nếu có Unique Index) ---
    // (Giữ lại logic này như một lớp bảo vệ frontend)
    const existingNote = await Note.findOne({
      user_id: req.user._id,
      original: original.trim(),
    });
    if (existingNote) {
      return res.status(400).json({ msg: 'Note already exists for this user' });
    }

    // --- BƯỚC 2: TẠO NOTE VÀ LƯU VÀO DB ĐỂ KHÓA (Atomic) ---
    // Lưu Note *trước* khi upload ảnh.
    // Nếu Request B đến đây, nó sẽ bị chặn nếu có Unique Index (tránh duplicate note).
    const note = new Note({
      user_id: req.user._id,
      translate,
      original,
      // image và public_id ban đầu là rỗng/chưa có
      version: 1 // Bắt đầu version 1
    });

    await note.save();

    // Request A thành công, Request B bị chặn ở đây nếu có Unique Index (E11000)

    // --- BƯỚC 3: UPLOAD ẢNH (CHỈ KHI LƯU DB THÀNH CÔNG) ---
    let imageUrl = '';
    let uploadedPublicId = '';

    if (image) {
      const public_id = public_id_base; // Sử dụng public_id đã tạo ở trên

      try {
        const uploadResult = await cloudinary.uploader.upload(image, {
          folder: 'notes_images',
          public_id: public_id,
          overwrite: true,
          invalidate: true
        });
        imageUrl = uploadResult.secure_url;
        uploadedPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.error("🔥 Lỗi upload ảnh. Tiến hành xóa Note đã tạo:", note._id);
        // RẤT QUAN TRỌNG: Nếu upload lỗi, phải xóa bản ghi Note đã tạo ở Bước 2
        await Note.deleteOne({ _id: note._id });
        return res.status(500).json({ msg: 'Lỗi upload ảnh, không thể tạo Note.' });
      }
    }

    // --- BƯỚC 4: CẬP NHẬT NOTE VỚI IMAGE INFO ---
    if (imageUrl) {
      await Note.updateOne(
        { _id: note._id },
        {
          $set: {
            image: imageUrl,
            public_id: uploadedPublicId,
          }
        }
      );
      // Cập nhật đối tượng note trả về
      note.image = imageUrl;
      note.public_id = uploadedPublicId;
    }


    res.json(note);
  } catch (err) {
    // Xử lý lỗi Duplicate Key (E11000)
    if (err.code && err.code === 11000) {
      console.warn("⚠️ Chặn duplicate note (E11000 detected)");
      return res.status(400).json({ msg: 'Note đã tồn tại (Lỗi lưu trữ song song)' });
    }

    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};
// ✅ READ ALL
const getNotes = async (req, res) => {
  const user_id = req.user._id;

  try {
  const notes = await Note
      .find({ user_id })
      .sort({ updated_at: -1, _id: -1 });
    console.log(`✅ Found ${notes.length} notes for user ${user_id}`);
    res.json(notes);
  } catch (err) {
    console.error("❌ GetNotes Error:", err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ONE
const getNoteById = async (req, res) => {
  const id = req.params.id;
  const user_id = req.user._id;
  try {
    const note = await Note.findOne({ _id: id, user_id });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ UPDATE (Cập nhật note + ảnh Cloudinary)
const updateNote = async (req, res) => {
  // Biến để lưu Public ID của ảnh mới upload (dùng cho việc dọn dẹp)
  let uploadedPublicId = null;

  try {
    const { translate, original, image, version } = req.body;

    console.log("🟢 Nhận request update note:", req.params.id, req.user?.id);

    // 1. Tìm note và kiểm tra tồn tại
    const note = await Note.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!note) {
      console.warn("⚠️ Note không tồn tại:", req.params.id);
      return res.status(404).json({ msg: 'Note not found' });
    }

    const clientUpdate = Number(version);
    const lastUpdate = Number(note.version);

    console.log(`🧩 Client Version: ${clientUpdate} | DB Version: ${lastUpdate}`);

    // 2. Kiểm tra phiên bản (Optimistic Locking)
    if (clientUpdate < lastUpdate) {
      console.warn("❌ Chặn cập nhật: Client version cũ hơn DB.");
      return res.status(409).json({
        msg: 'Note đã được cập nhật bởi một phiên làm việc khác. Vui lòng tải lại trang.',
        lastUpdate,
        clientUpdate,
      });
    }

    // 🔑 Chỉ tiếp tục nếu clientUpdate === lastUpdate

    if (clientUpdate === lastUpdate) {

      let imageUrl = note.image;
      let public_id = note.public_id;

      // 3. Xử lý Upload/Thay thế ảnh (Thao tác I/O tốn thời gian)
      if (image) {
        try {
          // Xóa ảnh cũ
          if (public_id) {
            console.log("🗑️ Xóa ảnh cũ:", public_id);
            await cloudinary.uploader.destroy(public_id, { invalidate: true });
          }

          // Upload ảnh mới
          const newPublicId = `note_${req.user._id}_${Date.now()}`;
          console.log("⬆️ Upload ảnh mới:", newPublicId);

          const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'notes_images',
            public_id: newPublicId,
            overwrite: true,
            invalidate: true,
          });

          imageUrl = uploadResult.secure_url;
          public_id = uploadResult.public_id;
          // LƯU PUBLIC ID MỚI VÀO BIẾN TẠM THỜI CHO VIỆC DỌN DẸP
          uploadedPublicId = public_id;

        } catch (uploadErr) {
          console.error("🔥 Lỗi upload ảnh lên Cloudinary:", uploadErr);
          // Nếu lỗi upload, dừng lại ngay TRƯỚC khi chạm vào DB
          return res.status(500).json({ msg: 'Lỗi upload ảnh', error: uploadErr.message });
        }
      }

      // 4. Cập nhật dữ liệu & Tăng version (Thao tác Atomic - Đảm bảo tính nguyên tử)
      const newVersion = lastUpdate + 1;

      const updatedNote = await Note.findOneAndUpdate(
        {
          _id: req.params.id,
          user_id: req.user._id,
          version: clientUpdate // 🔑 ĐIỀU KIỆN KHÓA! Phải khớp với version gửi lên
        },
        {
          $set: {
            // Chỉ cập nhật nếu giá trị có mặt (translate, original)
            translate: translate ?? note.translate,
            original: original ?? note.original,
            image: imageUrl,
            public_id: public_id,
            version: newVersion // Tăng version mới
          }
        },
        { new: true } // Trả về bản ghi đã được cập nhật
      );

      // 5. Kiểm tra kết quả Atomic Update (Xử lý Race Condition & Rò rỉ tài nguyên)
      if (!updatedNote) {
        console.warn("⚠️ Cập nhật thất bại: Race Condition detected (version đã thay đổi)");

        // 🗑️ DỌN DẸP: Xóa ảnh đã upload trong request thất bại này
        if (image && uploadedPublicId) {
          try {
            console.log("🗑️ Dọn dẹp: Xóa ảnh rò rỉ:", uploadedPublicId);
            await cloudinary.uploader.destroy(uploadedPublicId, { invalidate: true });
          } catch (cleanupErr) {
            console.error("🔥 Cảnh báo: Lỗi khi cố gắng xóa ảnh rò rỉ:", cleanupErr.message);
            // Tiếp tục trả về lỗi 409
          }
        }

        return res.status(409).json({
          msg: 'Note đã được cập nhật bởi một người khác. Vui lòng tải lại dữ liệu.',
          clientUpdate,
        });
      }

      // 6. Trả về thành công
      console.log(`✅ Cập nhật note thành công, Version mới: ${newVersion}`);
      return res.json({
        note: updatedNote, // Trả về bản ghi đã được cập nhật
        msg: 'Dữ liệu cập nhật thành công',
        clientUpdate,
        lastUpdate: updatedNote.version, // Trả về version mới
      });
    }
  } catch (err) {
    console.error("🔥 Lỗi máy chủ không xác định:", err.message);
    res.status(500).json({
      msg: 'Server error',
      error: err.message,
      stack: err.stack,
    });
  }
};
// ✅ DELETE (Xóa note + ảnh Cloudinary)
const deleteNote = async (req, res) => {
  console.log("ID param:", req.params.id);
console.log("User from token:", req.user);

  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!note) return res.status(404).json({ msg: 'Note not found' });

    // Nếu note có ảnh thì xóa ảnh khỏi Cloudinary
    if (note.public_id) {
      await cloudinary.uploader.destroy(note.public_id, { invalidate: true });
    }

    // Xóa khỏi DB
    await note.deleteOne();

    res.json({ msg: 'Note and image deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote
};
