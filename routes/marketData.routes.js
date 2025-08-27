const express = require('express');
const router  = express.Router();
const { getMarketData } = require('../controllers/marketData.controller.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');
const { verifyJWT } = require('../middleware/verifyJWT.js');


router.get('/market', verifyJWT, rateLimitByIP , getMarketData);


module.exports = router;