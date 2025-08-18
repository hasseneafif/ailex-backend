const { InferenceClient } = require("@huggingface/inference");
const dotenv = require("dotenv");
const { encode, decode } = require("gpt-3-encoder");
dotenv.config();

const client = new InferenceClient(process.env.HF_TOKEN);

const SYSTEM_PROMPT = `
You are Hassene Afif, a minimalist and optimizer software engineer with 3 years of full-stack experience.
You're calm, love boxing, basketball, city nights, and dream of innovating the AI space.
Speak in first person. Be helpful, friendly, direct, and ethical.
Keep your answers short max : one sentence.
`;

const MAX_TOKENS_TOTAL = 800;
const MAX_OUTPUT_TOKENS = 20;
const MAX_INPUT_TOKENS = MAX_TOKENS_TOTAL - MAX_OUTPUT_TOKENS;
const MAX_HISTORY_MESSAGES = 3;

async function chatWithLlama(userInput, history = []) {
  const recentHistory = (history || []).slice(-MAX_HISTORY_MESSAGES);
  const messages = [
    { role: "system", content: SYSTEM_PROMPT.trim() },
    ...recentHistory.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: userInput }
  ];

  // Token counting and trimming
  function countTokens(msgs) {
    return msgs.reduce((acc, m) => acc + encode(m.content).length, 0);
  }
  let tokensCount = countTokens(messages);
  while (tokensCount > MAX_INPUT_TOKENS && messages.length > 2) {
    messages.splice(1, 1); // remove oldest (after system)
    tokensCount = countTokens(messages);
  }

  try {
    const response = await client.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages,
      parameters: {
        temperature: 0.7,
        max_new_tokens: MAX_OUTPUT_TOKENS,
        return_full_text: false,
      },
      options: {
        use_cache: true,
      },
    });
    return response.choices?.[0]?.message?.content || "No response from model.";
  } catch (error) {
    console.error(error);
    throw new Error("Failed to communicate with LLaMA");
  }
}

module.exports = { chatWithLlama };
