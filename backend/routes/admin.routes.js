const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');

// Public route to fetch cities and areas for signup selectors
router.get('/locations', adminController.getCitiesAndAreas);
router.get('/packages/public', adminController.getActivePackagesPublic);

// Protected Admin-only routes
router.get('/dashboard', verifyToken, isAdmin, adminController.getDashboardStats);
router.get('/users', verifyToken, isAdmin, adminController.getUsers);
router.put('/users/:id/status', verifyToken, isAdmin, adminController.toggleUserStatus);
router.post('/create-admin', verifyToken, isAdmin, adminController.createAdmin);

router.get('/providers', verifyToken, isAdmin, adminController.getProviders);
router.put('/providers/:id/verify', verifyToken, isAdmin, adminController.verifyProvider);

router.get('/bookings', verifyToken, isAdmin, adminController.getBookings);

router.post('/locations/cities', verifyToken, isAdmin, adminController.addCity);
router.post('/locations/areas', verifyToken, isAdmin, adminController.addArea);

router.get('/support', verifyToken, isAdmin, adminController.getSupportMessages);
router.put('/support/:id/resolve', verifyToken, isAdmin, adminController.resolveSupportMessage);

// Subscription package CRUD
router.get('/packages', verifyToken, isAdmin, adminController.getSubscriptionPackages);
router.post('/packages', verifyToken, isAdmin, adminController.createSubscriptionPackage);
router.put('/packages/:id', verifyToken, isAdmin, adminController.updateSubscriptionPackage);
router.delete('/packages/:id', verifyToken, isAdmin, adminController.deleteSubscriptionPackage);

module.exports = router;
