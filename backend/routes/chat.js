const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

const router = express.Router();

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Obtener todos los chats del usuario
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('-messages');
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo chat
router.post('/', auth, async (req, res) => {
  try {
    const chat = new Chat({
      userId: req.userId,
      title: req.body.title || 'Nuevo chat'
    });
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un chat específico
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar mensaje
router.post('/:id/message', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    chat.messages.push({
      role: req.body.role,
      text: req.body.text,
      attachments: req.body.attachments || []
    });

    if (chat.messages.length === 1) {
      chat.title = req.body.text.slice(0, 30);
    }

    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subir archivo
router.post('/:id/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo' });
    }

    res.json({
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Compartir chat
router.post('/:id/share', auth, async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    chat.shareToken = crypto.randomBytes(16).toString('hex');
    chat.isShared = true;
    await chat.save();

    res.json({ 
      shareUrl: `${req.protocol}://${req.get('host')}/shared/${chat.shareToken}` 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ver chat compartido
router.get('/shared/:token', async (req, res) => {
  try {
    const chat = await Chat.findOne({ 
      shareToken: req.params.token,
      isShared: true 
    });
    
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }
    
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar chat
router.delete('/:id', auth, async (req, res) => {
  try {
    await Chat.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ message: 'Chat eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar título
router.patch('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title: req.body.title },
      { new: true }
    );
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
