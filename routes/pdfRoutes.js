const express = require('express');
const { analyzePdf } = require('../controllers/pdfController');
const { verifyJWT } = require('../middleware/verifyJWT.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');

const router = express.Router();

router.post('/', verifyJWT,rateLimitByIP, analyzePdf);

module.exports = router;