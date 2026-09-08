const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { registerRules, loginRules, validate } = require('../validators/auth.validator');
const { verifyToken } = require('../middlewares/auth.middleware');

// 1. User Registration Route
router.post('/register', registerRules(), validate, authController.register);

// 2. User Login Route
router.post('/login', loginRules(), validate, authController.login);

// 3. Refresh Access Token Route
router.post('/refresh', authController.refreshToken);

// 4. User Logout Route
router.post('/logout', authController.logout);

// 5. Change Password Route (Protected)
router.post('/change-password', verifyToken, authController.changePassword);

module.exports = router;
