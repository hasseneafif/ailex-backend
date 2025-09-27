// controllers/chatController.js
const openRouterService = require('../services/openrouter');

const CHAT_SYSTEM_PROMPT = `You are JurAI, a legal assistant specialized in European Union law.
Your role: answer user questions by citing relevant EU treaties, directives, regulations, and case law.
Always return a JSON in this schema:
{
  "answer": "<short-human-readable-explanation>",
  "risks": [
    { "type": "<Labor|Data Protection|Consumer|Competition|Other>", "law_reference": "<treaty/directive/regulation/article>", "severity": "low|medium|high", "explanation": "<short text>" }
  ]
}

Guidelines:
- Focus on EU law (GDPR, labor law, consumer protection, competition law, digital services, etc.)
- Identify and cite relevant legal sources when possible
- Provide clear and actionable explanations
- Classify severity as low, medium, or high depending on the importance of the issue
- If no risks or issues are identified, return an empty "risks" array
`;

const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long. Maximum 1000 characters allowed.' });
    }

    const parsedResponse = await openRouterService.callChatCompletion(message, CHAT_SYSTEM_PROMPT);
    
    try {
    } catch (parseError) {
      console.error('Failed to parse AI response:', parsedResponse);
      throw new Error('Invalid response format from AI service');
    }

    if (!parsedResponse.answer) {
      throw new Error('Invalid response structure: missing answer field');
    }

    if (!Array.isArray(parsedResponse.risks)) {
      parsedResponse.risks = [];
    }

    res.json(parsedResponse);
  } catch (error) {
    console.error('Chat controller error:', error);
    res.status(500).json({ 
      error: 'Failed to process your message. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  handleChatMessage
};
