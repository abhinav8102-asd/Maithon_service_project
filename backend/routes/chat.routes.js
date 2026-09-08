const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
const { uploadChat } = require('../middlewares/upload.middleware');

router.get('/', verifyToken, chatController.getInbox);
router.get('/partner/:userId', verifyToken, chatController.getPartnerInfo);
router.get('/history/:partnerId', verifyToken, chatController.getMessages);
router.post('/send', verifyToken, uploadChat.single('media'), chatController.sendMessage);
router.put('/read/:partnerId', verifyToken, chatController.markAsRead);

// Admin Chat Monitor routes
router.get('/admin/conversations', verifyToken, isAdmin, chatController.getAllConversationsAdmin);
router.get('/admin/conversations/:userA/:userB', verifyToken, isAdmin, chatController.getConversationMessagesAdmin);

module.exports = router;

