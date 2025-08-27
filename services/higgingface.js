import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();
const client = new InferenceClient(process.env.HF_TOKEN);

const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT.replace(/\\n/g, "\n");


/**
 * Predict stock movement using today's data + history
 * @param {Object} stock - single stock object with today values + historyJson
 * @returns {Promise<string>} - minimal prediction
 */
export async function predictStockWithHuggingFace(stock) {
  const todayValuesStr = `Today: Open=${stock.open}, High=${stock.high}, Low=${stock.low}, Close=${stock.close}, Last=${stock.last}, Volume=${stock.volume}`;

  const historyStr = stock.history
    .map((row) => row.join(", "))
    .join(" | ");

  const userInput = `${todayValuesStr}\nHistory: ${historyStr}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    { role: "user", content: userInput },
  ];

  try {
    const response = await client.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages,
      parameters: {
        temperature: 0.7,
        max_new_tokens: 10,
        return_full_text: false,
      },
      options: { use_cache: true },
    });

    return response.choices?.[0]?.message?.content || "X20_NO_RESPONSE_FROM_MODEL";
  } catch (error) {
    console.error("LLaMA API error:", error);
    return "Error fetching HF prediction.";
  }
}
