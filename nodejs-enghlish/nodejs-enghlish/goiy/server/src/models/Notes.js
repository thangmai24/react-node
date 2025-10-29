// models/Notes.js
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  translate: { type: String, required: false },
  original: { type: String, required: false },
  image: { type: String, required: false }, 
  public_id: { type: String, required: false },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // tự động thêm 2 cột thời gian
});
// ✅ Mỗi user chỉ được có 1 note với cùng "original"
noteSchema.index({ user_id: 1, original: 1 }, { unique: true });

module.exports = mongoose.model('Note', noteSchema);

