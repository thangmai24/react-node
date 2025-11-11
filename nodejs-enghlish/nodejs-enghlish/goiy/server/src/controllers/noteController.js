import { validationResult } from 'express-validator';

import Note from '../models/Notes.js';


import { v2 as cloudinary } from 'cloudinary';
// ✅ CREATE
export const createNote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ msg: errors.array()[0].msg });
  console.log("🌥️ Cloud name:", process.env.CLOUDINARY_CLOUD_NAME);
  try {
    const { translate, original, image } = req.body;


    let imageUrl = '';
    let uploadResult = null;
    const public_id = `note_${req.user.id}_${Date.now()}`;
    // ✅ Kiểm tra duplicate
    const existingNote = await Note.findOne({
      user_id: req.user.id,
      original: original.trim(),
    });
    if (existingNote) {
      return res.status(400).json({ msg: 'Note already exists for this user' });
    }

    if (image) {

      uploadResult = await cloudinary.uploader.upload(image, {
        folder: 'notes_images',
        public_id: public_id, // đặt public_id tùy ý
        overwrite: true, // cho phép ghi đè khi upload lại
        invalidate: true // xóa cache cũ nếu có
      });
      imageUrl = uploadResult.secure_url;
    }
    const note = new Note({
      user_id: req.user.id,
      translate,
      original,
      image: imageUrl,
      public_id: public_id,
    });

    await note.save();

    res.json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ALL
export const getNotes = async (req, res) => {
  const user_id = req.user.id;
  try {
    const notes = await Note.find({ user_id });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ONE
export const getNoteById = async (req, res) => {
  const id = req.params.id;
  const user_id = req.user.id;
  try {
    const note = await Note.findOne({ _id: id, user_id });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
// ✅ UPDATE (Cập nhật note + ảnh Cloudinary)
export const updateNote = async (req, res) => {
  try {
    const { translate, original, image, version } = req.body;

    console.log("🟢 Nhận request update note:", req.params.id, req.user?.id);
    console.log("📦 Request body:", req.body);

    // Tìm note của user
    const note = await Note.findOne({
      _id: req.params.id,
      user_id: req.user.id,
    });

    if (!note) {
      console.warn("⚠️ Note không tồn tại:", req.params.id);
      return res.status(404).json({ msg: 'Note not found' });
    }

    const clientUpdate = Number(version);
    const lastUpdate = Number(note.version);

    console.log("🧩 clientUpdate:", clientUpdate, "| lastUpdate:", lastUpdate);

    if (clientUpdate < lastUpdate) {
      return res.status(409).json({
        msg: 'Note đã được cập nhật. Vui lòng tải lại trang.',
        lastUpdate,
        clientUpdate,
      });
    } else if (clientUpdate === lastUpdate) { // ✅ Sửa lại dấu so sánh

      // ⚙️ Tăng version NGAY LẬP TỨC
      note.version = lastUpdate + 1;
      await note.save(); // Lưu version mới để khóa phiên bản hiện tại

      let imageUrl = note.image;
      let public_id = note.public_id;

      if (image) {
        try {
          if (public_id) {
            console.log("🗑️ Xóa ảnh cũ:", public_id);
            await cloudinary.uploader.destroy(public_id, { invalidate: true });
          }

          const newPublicId = `note_${req.user.id}_${Date.now()}`;
          console.log("⬆️ Upload ảnh mới:", newPublicId);

          const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'notes_images',
            public_id: newPublicId,
            overwrite: true,
            invalidate: true,
          });

          imageUrl = uploadResult.secure_url;
          public_id = uploadResult.public_id;
        } catch (uploadErr) {
          console.error("🔥 Lỗi upload ảnh:", uploadErr);
          return res.status(500).json({ msg: 'Lỗi upload ảnh', error: uploadErr.message });
        }
      }

      // ✅ Cập nhật dữ liệu sau upload
      note.translate = translate ?? note.translate;
      note.original = original ?? note.original;
      note.image = imageUrl;
      note.public_id = public_id;

      await note.save();

      console.log("✅ Cập nhật note thành công:", note._id);
      return res.json({
        note,
        msg: 'Dữ liệu cập nhật thành công',
        clientUpdate,
        lastUpdate,
      });
    }
  } catch (err) {
    console.error("🔥 Lỗi cụ thể khi cập nhật note:", err.message);
    console.error(err.stack);
    res.status(500).json({
      msg: 'Server error',
      error: err.message,
      stack: err.stack,
    });
  }
};



// ✅ DELETE (Xóa note + ảnh Cloudinary)
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user_id: req.user.id,
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
