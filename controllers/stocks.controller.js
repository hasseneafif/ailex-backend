import jwt from "jsonwebtoken";
import Stock from "../models/stock.model.js";


export async function getStocks(req, res) {
  try {
    const stocks = await Stock.find().sort({ stockName: 1 }); 
    res.json({ success: true, stocks });
  } catch (err) {
    console.error("Error fetching all stocks :", err);
    res.status(500).json({ success: false, error: "Failed to fetch stocks" });
  }
}


export function meta(req, res) {
  const payload = { app: 'stock' };
  const secret = process.env.SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'SECRET not set in environment.' });
  }
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  res.json({ token });
}

