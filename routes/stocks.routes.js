const express = require('express');
const router  = express.Router();
const { getStocks, meta} = require('../controllers/stocks.controller.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');
const { verifyJWT } = require('../middleware/verifyJWT.js');

router.get('/all',verifyJWT, getStocks);


router.get('/ping', (req, res) => {
	res.json({ status: 'ok' });
});

router.get('/meta', rateLimitByIP, meta);

module.exports = router;