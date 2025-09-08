// code.controller.js
const { analyzeFileWithModel } = require("../services/or.js");

/**
 * Express handler example:
 * POST /api/analyze-file
 * body: { file: { name, path, content } }
 */
async function analyzeFileHandler(req, res) {
  try {
    const file = req.body?.file;
    if (!file || typeof file.content !== "string") {
      return res.status(400).json({ error: "Missing file content in request body." });
    }

    // minimal sanitation: strip extremely long leading/trailing whitespace
    file.content = file.content.trim();

    // optional: protect against obvious prompt injection attempts by stripping common "system" tokens
    // (we already instruct the model to ignore inline instructions in SYSTEM_PROMPT)
    if (file.content.length === 0) {
      return res.status(400).json({ error: "File content is empty." });
    }

    console.log(`Analyzing file: ${file.filename || "unnamed"} (${file.content.length} chars)`);

    // Call the GPT service (model selection and tuning done in gptService)
    const modelResult = await analyzeFileWithModel(file);

    // map to normalized array for frontend convenience
    const issues = (modelResult.issues || []).map((it) => ({
      line: it.line ?? null,
      range: it.range ?? null,
      message: it.message ?? "",
      severity: it.severity ?? "low",
      suggestion: it.suggestion ?? "",
      codeSnippet: it.codeSnippet ?? null,
    }));

    return res.json({ issues });
  } catch (err) {
    // be cautious about leaking internal info; send controlled error details
    const msg = err.message || "Unknown error";
    return res.status(500).json({ error: "Analysis failed", detail: msg });
  }
}

module.exports = { analyzeFileHandler };