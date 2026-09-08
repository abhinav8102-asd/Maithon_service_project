const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
const { uploadService } = require('../middlewares/upload.middleware');

// Public route to fetch configurations
router.get('/', settingController.getSettings);

// Admin-only route to update configurations with logo upload support
router.put(
  '/',
  verifyToken,
  isAdmin,
  uploadService.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'heroBgImage', maxCount: 1 }
  ]),
  settingController.updateSettings
);

module.exports = router;
