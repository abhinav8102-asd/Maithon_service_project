const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware');
const { uploadService } = require('../middlewares/upload.middleware');

// Public routes
router.get('/', categoryController.getCategories);
router.get('/:id', categoryController.getCategoryById);

// Admin-only routes (protected)
router.post(
  '/', 
  verifyToken, 
  isAdmin, 
  uploadService.fields([
    { name: 'icon', maxCount: 1 }, 
    { name: 'banner', maxCount: 1 }
  ]), 
  categoryController.createCategory
);

router.put(
  '/:id', 
  verifyToken, 
  isAdmin, 
  uploadService.fields([
    { name: 'icon', maxCount: 1 }, 
    { name: 'banner', maxCount: 1 }
  ]), 
  categoryController.updateCategory
);

router.delete('/:id', verifyToken, isAdmin, categoryController.deleteCategory);

module.exports = router;
