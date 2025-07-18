const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const UserRoute = require('./routes/user.routes');
const ContactRoute = require('./routes/contact.routes');
const auth = require("./middleware/auth");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(express.json({ limit: "50mb" }));

// MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Atlas connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', UserRoute);
app.use('/api/contact', ContactRoute);

// Test Route (Protected)
app.get("/welcome", auth, (req, res) => {
  res.status(200).send("Welcome");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
