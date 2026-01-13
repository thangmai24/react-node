const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('../config/redis');

const REFRESH_TTL_SECONDS = 3600;
const ACCESS_TTL_SECONDS = 60; // access token lifetime in seconds
const isProd = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'none',
  maxAge: REFRESH_TTL_SECONDS * 1000,
  path: '/api/users'
};

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({name, email, password });
    await user.save();

    const payload = { id: user.id,  name: user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${ACCESS_TTL_SECONDS}s` });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`rt:${refreshToken}`, user.id, { ex: REFRESH_TTL_SECONDS });
    res.cookie('refresh_token', refreshToken, refreshCookieOptions);

    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = { id: user.id, name: user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${ACCESS_TTL_SECONDS}s` });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`rt:${refreshToken}`, user.id, { ex: REFRESH_TTL_SECONDS });
    res.cookie('refresh_token', refreshToken, refreshCookieOptions);

    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.status(400).json({ msg: 'Missing refresh token' });

    const userId = await redis.get(`rt:${refreshToken}`);
    if (!userId) return res.status(401).json({ msg: 'Invalid or expired refresh token' });

    await redis.del(`rt:${refreshToken}`);
    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`rt:${newRefreshToken}`, userId, { ex: REFRESH_TTL_SECONDS });
    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions);

    const payload = { id: userId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${ACCESS_TTL_SECONDS}s` });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await redis.del(`rt:${refreshToken}`);
    }
    res.clearCookie('refresh_token', { ...refreshCookieOptions, maxAge: 0 });
    res.json({ msg: 'Logged out' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout };
