const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Generar respuesta con Groq o Gemini (gratis)
router.post('/generate', auth, async (req, res) => {
  try {
    const { messages } = req.body;

    // Detectar si hay imágenes en los mensajes
    const hasImages = messages.some(m => m.image);

    // Si hay imágenes, usar Groq con Llama Vision
    if (hasImages) {
      console.log('Usando Groq Llama Vision para análisis de imagen');
      
      const imageMessage = messages.find(m => m.image);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.2-90b-vision-preview',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: '¿Qué ves en esta imagen? Describila en detalle en español.' },
              { type: 'image_url', image_url: { url: imageMessage.image } }
            ]
          }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      console.log('Respuesta de Groq Vision:', data);

      if (!response.ok) {
        console.error('Error de Groq:', data);
        throw new Error(data.error?.message || 'Error en Groq API');
      }

      const text = data.choices[0].message.content;
      return res.json({ text });
    }

    // Para mensajes de texto, usar Groq
    console.log('Usando Groq para texto');
    const model = 'llama-3.3-70b-versatile';

    const formattedMessages = messages.map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.text
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Sos un asistente útil que siempre responde en español. Respondé de forma clara, amigable y concisa.' },
          ...formattedMessages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de Groq:', data);
      throw new Error(data.error?.message || 'Error en Groq API');
    }

    res.json({ 
      text: data.choices[0].message.content 
    });
  } catch (err) {
    console.error('Error en IA:', err);
    res.status(500).json({ 
      error: 'Error al generar respuesta',
      fallback: 'Lo siento, hubo un error. Por favor intenta de nuevo.' 
    });
  }
});

module.exports = router;
