const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { verifyToken, isCustomer } = require('../middlewares/auth.middleware');
const { uploadProfile } = require('../middlewares/upload.middleware');

// Public Search & support routes
router.get('/providers/search', customerController.searchProviders);
router.get('/providers/:id', customerController.getProviderDetails);
router.post('/support', customerController.contactSupport);

// Customer-only Protected routes
router.get('/profile', verifyToken, isCustomer, customerController.getProfile);
router.put(
  '/profile', 
  verifyToken, 
  isCustomer, 
  uploadProfile.single('profilePicture'), 
  customerController.updateProfile
);
router.post('/favorites', verifyToken, isCustomer, customerController.toggleFavorite);
router.get('/favorites', verifyToken, isCustomer, customerController.getFavorites);
router.post('/reviews', verifyToken, isCustomer, customerController.postReview);

module.exports = router;
