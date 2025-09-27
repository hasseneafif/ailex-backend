// routes/pdfRoutes.js
const express = require('express');
const { analyzePdf } = require('../controllers/pdfController');
const { verifyJWT } = require('../middleware/verifyJWT.js');

const router = express.Router();

// POST /api/analyze-pdf
router.post('/', verifyJWT, analyzePdf);

module.exports = router;