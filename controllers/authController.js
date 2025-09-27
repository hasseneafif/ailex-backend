import jwt from "jsonwebtoken";

export function meta(req, res) {
  const payload = { app: 'analyze' };
  const secret = process.env.SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'SECRET not set in environment.' });
  }
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  res.json({ token });
}