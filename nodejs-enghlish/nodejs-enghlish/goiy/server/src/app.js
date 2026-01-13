const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const noteRoutes = require('./routes/noteRoutes');
const { sendChat } = require('./controllers/chatController');
const otpRoutes = require('./routes/otpRoutes');
dotenv.config();


require('./config/cloudinary');
connectDB();

const app = express();

const corsOptions = {
  origin: [ 
    process.env.CORS_ORIGIN 
  ],

  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.post('/api/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.use('/api/notes', authMiddleware, noteRoutes);

// Protected chat route
app.post('/api/chat', authMiddleware, sendChat);


app.use('/api/otp', otpRoutes);
module.exports = app;
