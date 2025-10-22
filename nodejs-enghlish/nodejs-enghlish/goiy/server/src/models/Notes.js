// models/Notes.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  translate: { type: String, required: false },
  original: { type: String, required: false },
  image: { type: String, required: false }, 
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // tự động thêm 2 cột thời gian
});

module.exports = mongoose.model('Note', noteSchema);

