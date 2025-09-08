const express = require('express');
const router  = express.Router();
const { getRepoFiles, meta} = require('../controllers/repo.controller.js');
const { rateLimitByIP } = require('../middleware/rateLimit.js');
const { verifyJWT } = require('../middleware/verifyJWT.js');


router.get('/ping', (req, res) => {
	res.json({ status: 'ok' });
});

router.get('/meta', rateLimitByIP, meta); 


router.post("/repo-files", async (req, res) => {
  const { repoUrl, extensions, githubToken } = req.body;

  if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

  try {
    const tree = await getRepoFiles(repoUrl, extensions || [], githubToken);
    res.status(200).json(tree);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch repo files" });
  }
});

module.exports = router;