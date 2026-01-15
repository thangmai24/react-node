const express = require('express');
const { register, login, refresh, logout, getProfile, updateProfile, deleteUser, getAllUsers } = require('../controllers/userController');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);
router.delete('/profile', auth, deleteUser);
router.get('/users', auth, getAllUsers);

module.exports = router;
