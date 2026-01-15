// controllers/otpController.js
const nodemailer = require('nodemailer');
const OtpModel = require('../models/OtpModel');
const UserModel = require('../models/User'); // Giả sử bạn có model User để kiểm tra email tồn tại

// Cấu hình Transporter (Người đưa thư)
// Sử dụng SendGrid cho độ tin cậy cao trên cloud platforms như Render
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY, // API key từ SendGrid
  },
});

// Hàm tạo mã OTP ngẫu nhiên 6 chữ số
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Kiểm tra user có tồn tại không (Tuỳ logic dự án)
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }

    // 2. Tạo mã OTP
    const otpCode = generateOTP();

    // 3. Lưu OTP vào Database (Dùng upsert để nếu email này đã có OTP cũ thì ghi đè)
    // Lưu ý: Trong thực tế nên Hash OTP trước khi lưu để bảo mật (giống mật khẩu)
    await OtpModel.findOneAndUpdate(
      { email }, 
      { otp: otpCode, createdAt: new Date() }, 
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Cấu hình nội dung email
    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Mã xác thực OTP của bạn',
      html: `
        <h3>Mã xác thực OTP</h3>
        <p>Mã của bạn là: <b style="font-size: 24px; color: blue;">${otpCode}</b></p>
        <p>Mã này sẽ hết hạn sau 5 phút.</p>
      `,
    };

    // 5. Gửi mail
    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Đã gửi OTP thành công, vui lòng kiểm tra email' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi gửi email', error: error.message });
  }
};

// Hàm verify OTP (để bạn dùng ở bước sau)
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const validOtp = await OtpModel.findOne({ email, otp });
        if (!validOtp) {
            return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
        }
        
        // Nếu đúng thì xóa OTP đi để không dùng lại được nữa
        await OtpModel.deleteOne({ email });
        
        // Tiến hành các bước tiếp theo (ví dụ: đổi mật khẩu, verify tài khoản...)
        return res.status(200).json({ message: 'Xác thực thành công' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

exports.sendOtpForRegister = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã tồn tại' });
    }

    // Generate OTP
    const otpCode = generateOTP();

    // Save OTP
    await OtpModel.findOneAndUpdate(
      { email }, 
      { otp: otpCode, createdAt: new Date() }, 
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send email
    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Mã xác thực đăng ký',
      html: `
        <h3>Mã xác thực đăng ký</h3>
        <p>Mã của bạn là: <b style="font-size: 24px; color: blue;">${otpCode}</b></p>
        <p>Mã này sẽ hết hạn sau 5 phút.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: 'Đã gửi OTP thành công' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi gửi email', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    // Verify OTP
    const validOtp = await OtpModel.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: 'Mã OTP không đúng hoặc đã hết hạn' });
    }

    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Delete OTP
    await OtpModel.deleteOne({ email });

    return res.status(200).json({ message: 'Mật khẩu đã được reset' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};