const express = require('express');
const { meta } = require('../controllers/authController');
const router = express.Router();
const { rateLimitByIP } = require('../middleware/rateLimit');

router.get('/meta',rateLimitByIP,  meta); 

module.exports = router;