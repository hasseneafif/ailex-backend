import { predictStockWithHuggingFace } from "../services/higgingface.js";
import { predictStockWithGroq } from "../services/groqcloud.js";

import axios from "axios";
import * as XLSX from "xlsx";
import Stock from "../models/stock.model.js";
import dotenv from "dotenv";

dotenv.config();

// Pool of realistic user-agents
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
];

// Pool of accept-languages
const acceptLanguages = [
  "en-US,en;q=0.9",
  "fr-FR,fr;q=0.9,en;q=0.8",
  "ar-TN,ar;q=0.9,en;q=0.8",
];

// Env variables
const API_MARKETS = process.env.API_MARKETS;
const API_EXPORT = process.env.API_EXPORT;
const API_REFERER = process.env.API_REFERER;
const API_ORIGIN = process.env.API_ORIGIN;
const MISSING_HISTORY_PROMPT = process.env.MISSING_HISTORY_PROMPT || "History unavailable. Use today's data.";
const ALL_PREDICTIONS_FAILED = process.env.ALL_PREDICTIONS_FAILED || "No prediction available.";


// ===== Helpers =====
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStartAndEndDates(monthsAgo = 3) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const start = new Date(today);
  start.setMonth(today.getMonth() - monthsAgo);
  return {
    startDate: formatDate(start),
    endDate: formatDate(yesterday),
  };
}

// Retry wrapper for network requests
async function fetchWithRetry(url, randomAgent, randomLang, type = "json", retries = 3, delay = 10000) {
  try {
    const data = await fetchRawData(url, randomAgent, randomLang, type);
    if (!data) throw new Error("No data returned");
    return data;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Retrying ${url}, attempts left: ${retries}`);
      await sleep(delay);
      return fetchWithRetry(url, randomAgent, randomLang, type, retries - 1, delay * 2);
    }
    throw new Error(`Failed fetching ${url} after retries: ${err.message}`);
  }
}

async function fetchRawData(url, randomAgent, randomLang, responseType = "json") {
  try {
    const response = await axios.get(url, {
      responseType: responseType === "excel" ? "arraybuffer" : "json",
      headers: {
        "User-Agent": randomAgent,
        "Accept": responseType === "excel" ? "*/*" : "application/json,text/html;q=0.9",
        "Accept-Language": randomLang,
        "Referer": API_REFERER,
        "Origin": API_ORIGIN,
        "Connection": "keep-alive",
      },
    });
    return response.data;
  } catch (err) {
    console.error(`Failed fetching URL ${url}:`, err.message);
    return null;
  }
}

function handleXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  return sheetData
    .slice(1)
    .filter((row) => row.slice(1).some((v) => v !== 0 && v != null));
}

async function saveMarketToDB(market) {
  try {
    const stockDoc = new Stock({
      isin: market.isin,
      stockName: market.stockName,
      ticker: market.ticker,
      open: market.open,
      high: market.high,
      low: market.low,
      close: market.close,
      last: market.last,
      volume: market.volume,
      prediction: market.prediction,
    });
    await stockDoc.save();
    console.log(`✅ Saved stock: ${market.stockName}`);
  } catch (err) {
    console.error(`Failed saving ${market.stockName}:`, err.message);
  }
}

// Safe prediction wrapper
async function predictStockSafe(market) {
  let method = "GC";
  try {
    let prediction = await predictStockWithGroq(market);
    if (prediction === "X20_NO_RESPONSE_FROM_MODEL") {
      console.log("Moving to Hugging Face");
      prediction = await predictStockWithHuggingFace(market);
      method = "HF";
    }

    // If HuggingFace also fails or returns empty
    if (!prediction || prediction === "X20_NO_RESPONSE_FROM_MODEL") {
      console.warn(`Both models failed for ${market.stockName}. Using static fallback.`);
      prediction = ALL_PREDICTIONS_FAILED;
      method = "STATIC";
    }

    return { prediction, method };
  } catch (err) {
    console.error(`Prediction error for ${market.stockName}:`, err.message);
     return {
      prediction: ALL_PREDICTIONS_FAILED,
      method: "STATIC",
    };
  }
}


// ===== Main function =====
export async function getMarketData(req, res) {
  try {

    const randomAgent = getRandomItem(userAgents);
    const randomLang = getRandomItem(acceptLanguages);
    const { startDate, endDate } = getStartAndEndDates();

    // 1️⃣ Fetch markets with retries
    const marketsResponse = await fetchWithRetry(API_MARKETS, randomAgent, randomLang, "json");

    if (!marketsResponse || !Array.isArray(marketsResponse.markets)) {
    console.error("Invalid markets response:", marketsResponse);
    return res.status(500).json({ error: "Error fetching stocks" });
    }

    const markets = marketsResponse.markets.map((m) => ({
      isin: m.isin ?? null,
      stockName: m.referentiel?.stockName ?? null,
      ticker: m.referentiel?.ticker ?? null,
      open: m.open ?? null,
      high: m.high ?? null,
      low: m.low ?? null,
      close: m.close ?? null,
      last: m.last ?? null,
      volume: m.volume ?? null,
    }));

    await Stock.deleteMany({});


    // 2️⃣ Fetch history, predict, save (market by market)
    for (const market of markets) {
      try {
        const excelData = await fetchWithRetry(
          `${API_EXPORT}/${market.isin}/${startDate}/${endDate}`,
          randomAgent,
          randomLang,
          "excel"
        );
        market.history = excelData ? handleXlsx(excelData) : [[MISSING_HISTORY_PROMPT]];

        const { prediction, method } = await predictStockSafe(market);
        market.prediction = prediction;
        market.method = method;

        await saveMarketToDB(market);
        await sleep(2000); 

      } catch (err) {
        console.error(`Failed processing market ${market.stockName}:`, err.message);
        market.history = [[MISSING_HISTORY_PROMPT]];
      }
    }

    res.json({ markets });

  } catch (err) {
    console.error("Fetch API Error:", err.message);
    res.status(500).json({ error: "Failed to fetch market data" });
  }
}
