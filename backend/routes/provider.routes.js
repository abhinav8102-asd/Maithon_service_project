const express = require('express');
const router = express.Router();
const providerController = require('../controllers/provider.controller');
const { verifyToken, isProvider } = require('../middlewares/auth.middleware');
const { uploadDocument } = require('../middlewares/upload.middleware');

// Protected Provider-only routes
router.get('/profile', verifyToken, isProvider, providerController.getProfile);
router.put('/profile', verifyToken, isProvider, providerController.updateProfile);

router.post(
  '/kyc', 
  verifyToken, 
  isProvider, 
  uploadDocument.fields([
    { name: 'aadhaar', maxCount: 1 }, 
    { name: 'pan', maxCount: 1 }
  ]), 
  providerController.uploadKYC
);

router.post('/availability', verifyToken, isProvider, providerController.toggleAvailability);
router.get('/dashboard', verifyToken, isProvider, providerController.getDashboardStats);
router.get('/bookings', verifyToken, isProvider, providerController.getBookings);

// Services Portfolio Management
router.get('/services', verifyToken, isProvider, providerController.getProviderServices);
router.post('/services', verifyToken, isProvider, providerController.addProviderService);
router.put('/services/:serviceId', verifyToken, isProvider, providerController.updateProviderService);
router.delete('/services/:serviceId', verifyToken, isProvider, providerController.deleteProviderService);

// Subscription Billing
router.get('/subscriptions/active', verifyToken, isProvider, providerController.getActiveSubscription);
router.post('/subscriptions/purchase', verifyToken, isProvider, providerController.purchaseSubscription);

module.exports = router;
