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
    if (image) {
        uploadResult = await cloudinary.uploader.upload(image, {
        folder: 'notes_images',
        public_id: public_id, // đặt public_id tùy ý
        overwrite: true, // cho phép ghi đè khi upload lại
        invalidate: true // xóa cache cũ nếu có
      });
      imageUrl = uploadResult.secure_url;
    }
 // ✅ Kiểm tra duplicate
    const existingNote = await Note.findOne({
      user_id: req.user.id,
      original: original.trim(),
    });
    if (existingNote) {
      return res.status(400).json({ msg: 'Note already exists for this user' });
    }

    const note = new Note({
      user_id: req.user.id,
      translate,
      original,
      image: imageUrl,
      public_id: uploadResult.public_id,
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
  const { user_id } = req.body;
  try {
    const notes = await Note.find({ user_id });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ONE
export const getNoteById = async (req, res) => {
  const { user_id, id } = req.body;
  try {
    const note = await Note.findOne({ _id: id, user_id });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ UPDATE
export const updateNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      req.body,
      { new: true }
    );
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ DELETE
export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user.id,
    });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json({ msg: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};
