
const { chatWithLlama } = require("../services/higgingface.js");
const jwt = require('jsonwebtoken');

async function handleChat(req, res) {
  const { message, history } = req.body;
  try {
    const reply = await chatWithLlama(message, history);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { handleChat };

function meta(req, res) {
  const payload = { app: 'chat' };
  const secret = process.env.SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'SECRET not set in environment.' });
  }
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  res.json({ token });
}

module.exports.meta = meta;
