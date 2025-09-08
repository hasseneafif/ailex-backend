const express = require('express');
const router = express.Router();
const { 
  analyzeFileHandler,

} = require('../controllers/code.controller.js');

// Hybrid analysis endpoint
router.post('/analyze', analyzeFileHandler);



module.exports = router;
