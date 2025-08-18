const express = require('express');
const router  = express.Router();
const { handleChat, meta } = require('../controllers/chat.controller.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');
const { verifyJWT } = require('../middleware/verifyJWT.js');

router.post('/convo',  rateLimitByIP, verifyJWT, handleChat);

router.get('/meta', meta);

module.exports = router;