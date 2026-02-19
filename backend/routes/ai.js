const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Generar respuesta con Groq (gratis)
router.post('/generate', auth, async (req, res) => {
  try {
    const { messages } = req.body;

    // Detectar si hay imágenes en los mensajes
    const hasImages = messages.some(m => m.image);
    const model = hasImages ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

    console.log('Modelo seleccionado:', model);
    console.log('Tiene imágenes:', hasImages);

    // Formatear mensajes para la API
    const formattedMessages = messages.map(m => {
      const msg = {
        role: m.role === 'bot' ? 'assistant' : m.role,
      };

      // Si tiene imagen, usar formato de contenido múltiple
      if (m.image) {
        console.log('Procesando mensaje con imagen');
        msg.content = [
          { type: 'text', text: m.text || '¿Qué ves en esta imagen?' },
          { type: 'image_url', image_url: { url: m.image } }
        ];
      } else {
        msg.content = m.text;
      }

      return msg;
    });

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: 'Sos un asistente útil que siempre responde en español. Respondé de forma clara, amigable y concisa. Si te muestran una imagen, describila y analizala en detalle.' },
        ...formattedMessages
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log('Request body:', JSON.stringify(requestBody, null, 2).substring(0, 500));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    console.log('Respuesta de Groq:', data);

    if (!response.ok) {
      console.error('Error de Groq:', data);
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
