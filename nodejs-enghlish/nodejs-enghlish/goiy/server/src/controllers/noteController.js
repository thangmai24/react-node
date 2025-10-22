const { validationResult } = require('express-validator');
const Note = require('../models/Notes');

// ✅ CREATE
const createNote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ msg: errors.array()[0].msg });

  try {
    const { user_id, translate, original, image } = req.body;
    const note = new Note({
      user_id, 
      translate,
      original,
      image
    });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ALL
const getNotes = async (req, res) => {
    const { user_id }= req.body;
  try {
    const notes = await Note.find({ user_id });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// ✅ READ ONE (lấy 1 ghi chú theo ID)
const getNoteById = async (req, res) => {

        const { user_id, id } = req.body;
  try {
    const note = await Note.findOne({ _id: id, user_id: user_id });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json(note);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};


// ✅ UPDATE
const updateNote = async (req, res) => {
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
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!note) return res.status(404).json({ msg: 'Note not found' });
    res.json({ msg: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { createNote, getNotes, updateNote, deleteNote, getNoteById };
