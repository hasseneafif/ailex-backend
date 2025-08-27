import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT.replace(/\\n/g, "\n");


/**
 * Predict stock movement using today's data + history
 * @param {Object} stock - single stock object with today values + historyJson
 * @returns {Promise<string>} - minimal prediction
 */
export async function predictStockWithGroq(stock) {
  const todayValuesStr = `Today: Open=${stock.open}, High=${stock.high}, Low=${stock.low}, Close=${stock.close}, Last=${stock.last}, Volume=${stock.volume}`;

  const historyStr = stock.history
    .map((row) => row.join(", "))
    .join(" | ");

  const userInput = `${todayValuesStr}\nHistory: ${historyStr}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_TOKEN}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", 
        messages: [
          { role: "system", content: SYSTEM_PROMPT.trim() },
          { role: "user", content: userInput },
        ],
        max_completion_tokens: 100,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    return data.choices?.[0]?.message?.content || "X20_NO_RESPONSE_FROM_MODEL";
  } catch (error) {
    console.error("Groq API error:", error);
    return "Error fetching GC prediction.";
  }
}
