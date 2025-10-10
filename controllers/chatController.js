const AIService = require('../services/ai-service');

const CHAT_SYSTEM_PROMPT = process.env.CHAT_SYSTEM_PROMPT?.replace(/\\n/g, '\n');


const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long. Maximum 1000 characters allowed.' });
    }

    const parsedResponse = await AIService.callChatCompletion(message, CHAT_SYSTEM_PROMPT);
    
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
