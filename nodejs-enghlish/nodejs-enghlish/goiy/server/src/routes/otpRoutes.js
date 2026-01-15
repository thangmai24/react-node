const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);
router.post('/send-otp-register', otpController.sendOtpForRegister);
router.post('/reset-password', otpController.resetPassword);

module.exports = router;