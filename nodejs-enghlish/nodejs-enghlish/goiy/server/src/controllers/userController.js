const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('../config/redis');

const REFRESH_TTL_SECONDS = 1296000;
const ACCESS_TTL_SECONDS = 60; // access token lifetime in seconds
const isProd = process.env.NODE_ENV === 'production';
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  maxAge: REFRESH_TTL_SECONDS * 1000,
  path: '/api/users'
};

const register = async (req, res) => {
  try {
    const { email, password, name, age } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    user = new User({name, email, password, age });
    await user.save();

    const payload = { id: user.id,  name: user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${ACCESS_TTL_SECONDS}s` });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    await redis.set(`rt:${refreshToken}`, user.id, { ex: REFRESH_TTL_SECONDS });

    // Track active refresh tokens for the user and ensure set expires
    const userTokensKey = `user_tokens:${user.id}`;
    await redis.sadd(userTokensKey, refreshToken);
    await redis.expire(userTokensKey, REFRESH_TTL_SECONDS);

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

    // Track active refresh tokens for the user and ensure set expires
    const userTokensKey = `user_tokens:${user.id}`;
    await redis.sadd(userTokensKey, refreshToken);
    await redis.expire(userTokensKey, REFRESH_TTL_SECONDS);

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

    // 1. Lấy userId
    const userId = await redis.get(`rt:${refreshToken}`);
    if (!userId) return res.status(401).json({ msg: 'Invalid or expired refresh token' });

    console.log("🔄 Refreshing token for user ID:", userId);

    // --- LOGIC XÓA CŨ ---
    const userTokensKey = `user_tokens:${userId}`;
    const activeTokens = await redis.smembers(userTokensKey);

    if (activeTokens.length > 0) {
      const keysToDelete = activeTokens.map(token => `rt:${token}`);
      // Dùng del nhiều key 1 lúc trong upstash vẫn ok
      await redis.del(...keysToDelete);
    }

    // --- ADDITIONAL CLEANUP: scan for any rt:* keys whose value === userId ---
    try {
      let cursor = '0';
      const scanDeleteKeys = [];
      do {
        const res = await redis.scan(cursor, { MATCH: 'rt:*', COUNT: 100 });
        cursor = res[0];
        const keys = res[1] || [];
        for (const key of keys) {
          try {
            const val = await redis.get(key);
            if (String(val) === String(userId)) {
              scanDeleteKeys.push(key);
            }
          } catch (e) {
            // ignore single key errors
            console.warn('Warning checking key', key, e.message || e);
          }
        }
      } while (cursor !== '0');

      if (scanDeleteKeys.length > 0) {
        // delete in chunks to avoid too large arg list
        const chunkSize = 100;
        for (let i = 0; i < scanDeleteKeys.length; i += chunkSize) {
          const chunk = scanDeleteKeys.slice(i, i + chunkSize);
          await redis.del(...chunk);
        }
      }
    } catch (scanErr) {
      console.error('Redis scan cleanup error:', scanErr);
      // non-fatal: continue
    }

    // Xóa key hiện tại và set danh sách
    await redis.del(`rt:${refreshToken}`);
    await redis.del(userTokensKey);
    // --- KẾT THÚC LOGIC XÓA CŨ ---

    // 2. Tạo token mới
    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    // 3. Lưu token mới (SỬA LỖI Ở ĐÂY)
    // Thay vì 'EX', time -> dùng { ex: time }
    await redis.set(`rt:${newRefreshToken}`, userId, { ex: REFRESH_TTL_SECONDS });

    // 4. Cập nhật danh sách quản lý
    await redis.sadd(userTokensKey, newRefreshToken);
    await redis.expire(userTokensKey, REFRESH_TTL_SECONDS);

    // 5. Trả về client
    res.cookie('refresh_token', newRefreshToken, refreshCookieOptions);

    const payload = { id: userId };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: `${ACCESS_TTL_SECONDS}s` });
    res.json({ token });

  } catch (error) {
    console.error("Refresh Error:", error); // Log lỗi chi tiết ra để dễ debug
    res.status(500).json({ msg: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      // Try to find userId so we can remove token from their set as well
      const userId = await redis.get(`rt:${refreshToken}`);
      await redis.del(`rt:${refreshToken}`);
      if (userId) {
        await redis.srem(`user_tokens:${userId}`, refreshToken);
      }
    }
    res.clearCookie('refresh_token', { ...refreshCookieOptions, maxAge: 0 });
    res.json({ msg: 'Logged out' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    res.json(req.user);

  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, age } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (name) user.name = name;
    if (age) user.age = age;
    // if (email) user.email = email;

    await user.save();

    // Return updated user without password
    const updatedUser = user.toObject();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clean up tokens
    const userTokensKey = `user_tokens:${userId}`;
    const activeTokens = await redis.smembers(userTokensKey);
    if (activeTokens.length > 0) {
      const keysToDelete = activeTokens.map(token => `rt:${token}`);
      await redis.del(...keysToDelete);
    }
    await redis.del(userTokensKey);

    // Delete user
    await User.findByIdAndDelete(userId);

    res.clearCookie('refresh_token', { ...refreshCookieOptions, maxAge: 0 });
    res.json({ msg: 'User deleted' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { register, login, refresh, logout, getProfile, updateProfile, deleteUser, getAllUsers };
