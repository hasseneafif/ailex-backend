// controllers/pdfController.js
const pdf = require('pdf-parse');
const openRouterService = require('../services/openrouter');

const PDF_SYSTEM_PROMPT = `You are JurAI, a legal auditor specialized in EU contract/document compliance.
Analyze the provided contract text for legal issues under European Union law.
Return ONLY a valid JSON in this schema:
{
  "issues": [
    { "clause": "<contract excerpt>", "issue": "<short issue title>", "law_reference": "<treaty/directive/regulation/article>", "severity": "low|medium|high", "explanation": "<short explanation>" }
  ]
}

All responses must be in ENGLISH.

Check for:
- GDPR and data protection compliance
- EU labor law (working time, equal treatment, workplace safety)
- Consumer protection and unfair contract terms
- Digital Services Act / Digital Markets Act obligations
- Competition law restrictions
- Any clear violations of EU treaties or directives

Severity levels:
- High: Clear legal violation, immediate compliance risk
- Medium: Potential issues that require review
- Low: Best-practice recommendations or minor concerns

If no problems are detected, return {"issues": []}`;


const chunkText = (text, maxChunkSize = 3000) => {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // Very long sentence
        chunks.push(trimmedSentence.substring(0, maxChunkSize));
        currentChunk = trimmedSentence.substring(maxChunkSize);
      }
    } else {
      currentChunk += (currentChunk.length > 0 ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Fix spacing issues in PDF text
const fixSpaces = (text) => {
  text = text.replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2'); // lowercase-uppercase
  text = text.replace(/([»’])([A-Za-z0-9])/g, '$1 $2');  // punctuation followed by letter/number
  text = text.replace(/\s+/g, ' '); // collapse multiple spaces
  return text;
};

const analyzePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF téléchargé' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Le fichier doit être un PDF' });
    }

    let pdfData;
    try {
      pdfData = await pdf(req.file.buffer);
    } catch (pdfError) {
      console.error('Erreur lors de l\'analyse du PDF:', pdfError);
      return res.status(400).json({ error: 'Impossible de lire le PDF. Vérifiez qu\'il est valide.' });
    }

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return res.status(400).json({ error: 'Aucun contenu textuel trouvé dans le PDF' });
    }

    // Fix spacing issues
    const textContent = fixSpaces(pdfData.text.trim());

    const chunks = chunkText(textContent, 3000);
    const allIssues = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkPrefix = chunks.length > 1 ? `[Partie ${i + 1}/${chunks.length}] ` : '';
        const parsedResponse = await openRouterService.callPdfAnalysis(
          chunkPrefix + chunks[i],
          PDF_SYSTEM_PROMPT
        );

        try {
        } catch (parseError) {
          console.error(`Impossible de parser la réponse AI pour le chunk ${i + 1}:`, parsedResponse);
          continue;
        }

        if (parsedResponse.issues && Array.isArray(parsedResponse.issues)) {
          allIssues.push(...parsedResponse.issues);
        }
      } catch (chunkError) {
        console.error(`Erreur lors de l'analyse du chunk ${i + 1}:`, chunkError);
      }
    }

    // Remove duplicate issues
    const uniqueIssues = allIssues.filter((issue, index, self) =>
      index === self.findIndex(i =>
        i.issue === issue.issue && i.law_reference === issue.law_reference
      )
    );

    res.json({
      issues: uniqueIssues,
      metadata: {
        totalPages: pdfData.numpages,
        textLength: textContent.length,
        chunksAnalyzed: chunks.length
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'analyse du PDF:', error);
    res.status(500).json({
      error: 'Impossible d\'analyser le PDF. Veuillez réessayer.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  analyzePdf
};
