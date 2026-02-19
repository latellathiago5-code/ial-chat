const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Generar respuesta con Groq o Gemini (gratis)
router.post('/generate', auth, async (req, res) => {
  try {
    const { messages } = req.body;

    // Detectar si hay imágenes en los mensajes
    const hasImages = messages.some(m => m.image);

    // Si hay imágenes, usar Gemini; si no, usar Groq
    if (hasImages) {
      console.log('Usando Gemini para análisis de imagen');
      
      // Usar Gemini para imágenes
      const imageMessage = messages.find(m => m.image);
      const base64Data = imageMessage.image.split(',')[1]; // Remover el prefijo data:image/...
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: imageMessage.text || '¿Qué ves en esta imagen? Describila en detalle en español.' },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      const geminiData = await geminiResponse.json();
      console.log('Respuesta de Gemini:', geminiData);

      if (!geminiResponse.ok) {
        throw new Error(geminiData.error?.message || 'Error en Gemini API');
      }

      const text = geminiData.candidates[0].content.parts[0].text;
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
