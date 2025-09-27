// services/openrouter.js
const OpenAI = require('openai');

class OpenRouterService {
  constructor() {
    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
        "X-Title": "JurAI", // updated title
      }
    });
  }

  parseResponseToJSON(responseText) {
    if (!responseText || typeof responseText !== "string") {
      throw new Error("Invalid response text");
    }

    let cleaned = responseText.trim();

    // Remove markdown fences
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    }

    // Strip any junk before first JSON char
    const firstJsonChar = cleaned.search(/[{[]/);
    if (firstJsonChar > 0) {
      cleaned = cleaned.substring(firstJsonChar);
    }

    // Strip junk after last brace/bracket
    const lastJsonChar = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (lastJsonChar !== -1) {
      cleaned = cleaned.substring(0, lastJsonChar + 1);
    }

    // Try normal parse first
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Try repair step
      let repaired = cleaned
        .replace(/,(\s*[}\]])/g, "$1") // remove trailing commas
        .replace(/(\w+):/g, '"$1":');  // quote unquoted keys

      // Auto-close unfinished strings/arrays/objects
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;

      if (openBraces > closeBraces) {
        repaired += "}".repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        repaired += "]".repeat(openBrackets - closeBrackets);
      }

      // Ensure strings are closed
      const quoteCount = (repaired.match(/"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }

      try {
        return JSON.parse(repaired);
      } catch (err) {
        console.error("Failed JSON parse. Cleaned text:", cleaned);
        throw new Error(`JSON parse error: ${err.message}`);
      }
    }
  }




  async callOpenRouter(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || "meta-llama/llama-3.3-70b-instruct",
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1500,
        response_format: options.response_format || { type: "json_object" },
        ...options
      });

      console.log('OpenRouter raw response:', response.choices[0].message.content);

      const rawContent = response.choices[0].message.content;

      // Parse the response to JSON
      const parsedContent = this.parseResponseToJSON(rawContent);

      if (parsedContent === null) {
        throw new Error('Failed to parse AI response to valid JSON');
      }

      console.log('OpenRouter parsed response:', parsedContent);
      return parsedContent;

    } catch (error) {
      console.error('OpenRouter API Error:', error);
      throw new Error(`OpenRouter API request failed: ${error.message}`);
    }
  }

  async callChatCompletion(userMessage, systemPrompt) {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    return this.callOpenRouter(messages, {
      temperature: 0.3,
      max_tokens: 1000
    });
  }

  async callPdfAnalysis(textContent, systemPrompt) {
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please analyze the following document/contract text for compliance issues:\n\n${textContent}` }
    ];

    return this.callOpenRouter(messages, {
      temperature: 0.2,
      max_tokens: 2000
    });
  }
}

module.exports = new OpenRouterService();