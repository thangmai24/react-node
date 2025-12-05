// models/OtpModel.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String, // Lưu string để giữ số 0 ở đầu (ví dụ: 012345)
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // Quan trọng: Document sẽ tự động bị xóa sau 300 giây (5 phút)
  },
});

module.exports = mongoose.model('Otp', otpSchema);