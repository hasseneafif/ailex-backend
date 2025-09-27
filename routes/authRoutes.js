// routes/chatRoutes.js
const express = require('express');
const { meta } = require('../controllers/authController');
const router = express.Router();
const { rateLimitByIP } = require('../middleware/rateLimit');
// POST /api/chat

router.get('/meta',rateLimitByIP,  meta); 

module.exports = router;