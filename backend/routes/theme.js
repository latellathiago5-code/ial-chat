const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Obtener tema
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({ 
      theme: user.theme,
      customTheme: user.customTheme 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar tema
router.post('/', auth, async (req, res) => {
  try {
    const { theme, customTheme } = req.body;
    
    const user = await User.findById(req.userId);
    if (theme) user.theme = theme;
    if (customTheme) user.customTheme = customTheme;
    
    await user.save();
    res.json({ theme: user.theme, customTheme: user.customTheme });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
