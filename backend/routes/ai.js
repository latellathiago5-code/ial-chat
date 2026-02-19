const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Generar respuesta con Groq (gratis)
router.post('/generate', auth, async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Sos un asistente útil que siempre responde en español. Respondé de forma clara, amigable y concisa.' },
          ...messages.map(m => ({
          role: m.role === 'bot' ? 'assistant' : m.role,
          content: m.text
        })),
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Error en Groq API');
    }

    res.json({ 
      text: data.choices[0].message.content 
    });
  } catch (err) {
    console.error('Error Groq:', err);
    res.status(500).json({ 
      error: 'Error al generar respuesta',
      fallback: 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
    });
  }
});

module.exports = router;
