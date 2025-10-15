const app = require('./app');

const PORT = process.env.PORT || 5000;
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));