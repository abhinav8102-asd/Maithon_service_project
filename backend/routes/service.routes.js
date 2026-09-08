const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
const { uploadService } = require('../middlewares/upload.middleware');

// Public routes
router.get('/', serviceController.getServices);
router.get('/:id', serviceController.getServiceById);

// Admin-only routes (protected)
router.post(
  '/', 
  verifyToken, 
  isAdmin, 
  uploadService.array('images', 5), 
  serviceController.createService
);

router.put(
  '/:id', 
  verifyToken, 
  isAdmin, 
  uploadService.array('images', 5), 
  serviceController.updateService
);

router.delete('/:id', verifyToken, isAdmin, serviceController.deleteService);

// Provider assignment routes
router.post('/assign', verifyToken, isAdmin, serviceController.assignServiceToProvider);
router.post('/unassign', verifyToken, isAdmin, serviceController.unassignServiceFromProvider);

module.exports = router;
