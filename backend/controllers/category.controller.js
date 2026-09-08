const db = require('../models');
const logger = require('../utils/logger');

// Generate Slug from Category Name
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

// 1. GET ALL CATEGORIES
exports.getCategories = async (req, res, next) => {
  try {
    const { status } = req.query; // Optional filter (Enabled/Disabled)
    const filter = {};
    if (status) filter.status = status;

    const categories = await db.Category.findAll({
      where: filter,
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET SINGLE CATEGORY BY ID
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await db.Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 3. CREATE CATEGORY (Admin Only)
exports.createCategory = async (req, res, next) => {
  try {
    const { name, seoTitle, seoDescription, status } = req.body;
    
    // Check if category name exists
    const existing = await db.Category.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists.'
      });
    }

    const slug = slugify(name);

    // Handle files if uploaded
    let iconPath = null;
    let bannerPath = null;

    if (req.files) {
      if (req.files.icon) {
        iconPath = `/uploads/services/${req.files.icon[0].filename}`;
      }
      if (req.files.banner) {
        bannerPath = `/uploads/services/${req.files.banner[0].filename}`;
      }
    }

    const newCategory = await db.Category.create({
      name,
      slug,
      icon: iconPath,
      banner: bannerPath,
      seoTitle,
      seoDescription,
      status: status || 'Enabled'
    });

    logger.info(`Category created by admin: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: newCategory
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE CATEGORY (Admin Only)
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, seoTitle, seoDescription, status } = req.body;
    const categoryId = req.params.id;

    const category = await db.Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    if (name) {
      // Check if another category has this name
      const existing = await db.Category.findOne({ where: { name } });
      if (existing && existing.id !== category.id) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists.'
        });
      }
      category.name = name;
      category.slug = slugify(name);
    }

    // Handle image updates
    if (req.files) {
      if (req.files.icon) {
        category.icon = `/uploads/services/${req.files.icon[0].filename}`;
      }
      if (req.files.banner) {
        category.banner = `/uploads/services/${req.files.banner[0].filename}`;
      }
    }

    if (seoTitle) category.seoTitle = seoTitle;
    if (seoDescription) category.seoDescription = seoDescription;
    if (status) category.status = status;

    await category.save();
    logger.info(`Category updated by admin: ${category.name}`);

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE CATEGORY (Admin Only)
exports.deleteCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const category = await db.Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    await category.destroy();
    logger.info(`Category deleted by admin: ${category.name}`);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
