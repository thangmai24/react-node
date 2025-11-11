const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  translate: { type: String },
  original: { type: String },
  image: { type: String },
  public_id: { type: String },
  version: { type: Number, default: 1 },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

noteSchema.index({ user_id: 1, original: 1 }, { unique: true });

noteSchema.pre('findOneAndUpdate', function (next) {
  this.set({ $inc: { version: 1 } });
  next();
});

module.exports = mongoose.model('Note', noteSchema); // ✅ model đúng
