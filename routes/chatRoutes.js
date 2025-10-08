// routes/chatRoutes.js
const express = require('express');
const { handleChatMessage } = require('../controllers/chatController');
const { verifyJWT } = require('../middleware/verifyJWT.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');

const router = express.Router();

// POST /api/chat
router.post('/', verifyJWT,rateLimitByIP, handleChatMessage);

module.exports = router;