const pdf = require('pdf-parse');
const AIService = require('../services/ai-service');

const PDF_SYSTEM_PROMPT = process.env.PDF_SYSTEM_PROMPT?.replace(/\\n/g, '\n');

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
  text = text.replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2');
  text = text.replace(/([»’])([A-Za-z0-9])/g, '$1 $2');
  text = text.replace(/\s+/g, ' ');
  return text;
};

const analyzePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'The uploaded file must be a PDF.' });
    }

    let pdfData;
    try {
      pdfData = await pdf(req.file.buffer);
    } catch (pdfError) {
      console.error('Error while parsing PDF:', pdfError);
      return res.status(400).json({ error: 'Unable to read the PDF. Please make sure it is valid.' });
    }

    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return res.status(400).json({ error: 'No textual content found in the PDF.' });
    }

    const textContent = fixSpaces(pdfData.text.trim());
    const chunks = chunkText(textContent, 3000);
    const allIssues = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const chunkPrefix = chunks.length > 1 ? `[Part ${i + 1}/${chunks.length}] ` : '';
        const parsedResponse = await AIService.callPdfAnalysis(
          chunkPrefix + chunks[i],
          PDF_SYSTEM_PROMPT
        );

        try {
        } catch (parseError) {
          console.error(`Failed to parse AI response for chunk ${i + 1}:`, parsedResponse);
          continue;
        }

        if (parsedResponse.issues && Array.isArray(parsedResponse.issues)) {
          allIssues.push(...parsedResponse.issues);
        }
      } catch (chunkError) {
        console.error(`Error analyzing chunk ${i + 1}:`, chunkError);
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
    console.error('Error during PDF analysis:', error);
    res.status(500).json({
      error: 'Unable to analyze the PDF. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  analyzePdf
};
