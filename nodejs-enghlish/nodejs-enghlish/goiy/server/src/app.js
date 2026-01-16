const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const noteRoutes = require('./routes/noteRoutes');
const { sendChat, checkDictation, translateWithImage, splitTextWithAI } = require('./controllers/chatController');
const otpRoutes = require('./routes/otpRoutes');


require('./config/cloudinary');
connectDB();

const app = express();

// Parse env var into an array of allowed origins
const rawOrigins = process.env.CORS_ORIGIN || '';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim()).filter(Boolean);

// Cors options with per-request origin check
const corsOptions = {
  origin: (origin, callback) => {
   
    if (!origin) return callback(null, true);

  
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS error: origin ${origin} not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(cookieParser());

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.post('/api/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.use('/api/notes', authMiddleware, noteRoutes);

// Protected chat route
app.post('/api/chat', authMiddleware, sendChat);
app.post('/api/dictation/check', authMiddleware, checkDictation);
app.post('/api/dictation/translate', authMiddleware, translateWithImage);
app.post('/api/dictation/split', authMiddleware, splitTextWithAI);

app.use('/api/otp', otpRoutes);
module.exports = app;
