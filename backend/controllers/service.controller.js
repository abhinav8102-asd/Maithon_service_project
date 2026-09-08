const db = require('../models');
const logger = require('../utils/logger');

// 1. GET ALL SERVICES
exports.getServices = async (req, res, next) => {
  try {
    const { categoryId, status } = req.query;
    const filter = {};
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;

    const services = await db.Service.findAll({
      where: filter,
      include: [{ model: db.Category, attributes: ['id', 'name', 'slug'] }],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET SINGLE SERVICE BY ID
exports.getServiceById = async (req, res, next) => {
  try {
    const service = await db.Service.findByPk(req.params.id, {
      include: [{ model: db.Category, attributes: ['id', 'name', 'slug'] }]
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// 3. CREATE SERVICE (Admin Only)
exports.createService = async (req, res, next) => {
  try {
    const { categoryId, name, price, durationMinutes, description, requiredTools } = req.body;

    // Check category exists
    const category = await db.Category.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found.'
      });
    }

    // Process files if uploaded
    let serviceImages = [];
    if (req.files && req.files.length > 0) {
      serviceImages = req.files.map(file => `/uploads/services/${file.filename}`);
    }

    // Parse required tools from JSON string/array
    let parsedTools = [];
    if (requiredTools) {
      parsedTools = typeof requiredTools === 'string' ? JSON.parse(requiredTools) : requiredTools;
    }

    const newService = await db.Service.create({
      categoryId,
      name,
      price,
      durationMinutes,
      description,
      images: serviceImages,
      requiredTools: parsedTools,
      status: 'Active'
    });

    logger.info(`Service created by admin: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: newService
    });
  } catch (error) {
    next(error);
  }
};

// 4. UPDATE SERVICE (Admin Only)
exports.updateService = async (req, res, next) => {
  try {
    const { name, price, durationMinutes, description, requiredTools, status } = req.body;
    const serviceId = req.params.id;

    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    if (name) service.name = name;
    if (price) service.price = price;
    if (durationMinutes) service.durationMinutes = durationMinutes;
    if (description) service.description = description;
    if (status) service.status = status;

    if (requiredTools) {
      service.requiredTools = typeof requiredTools === 'string' ? JSON.parse(requiredTools) : requiredTools;
    }

    // Update images if new images uploaded
    if (req.files && req.files.length > 0) {
      const serviceImages = req.files.map(file => `/uploads/services/${file.filename}`);
      service.images = serviceImages;
    }

    await service.save();
    logger.info(`Service updated by admin: ${service.name}`);

    res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: service
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE SERVICE (Admin Only)
exports.deleteService = async (req, res, next) => {
  try {
    const service = await db.Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    await service.destroy();
    logger.info(`Service deleted by admin: ${service.name}`);

    res.status(200).json({
      success: true,
      message: 'Service deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 6. ASSIGN SERVICE TO PROVIDER (Admin Only)
exports.assignServiceToProvider = async (req, res, next) => {
  try {
    const { providerId, serviceId } = req.body;

    const provider = await db.Provider.findByPk(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found.'
      });
    }

    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    // Add service relation
    await provider.addService(service);
    logger.info(`Service (ID: ${serviceId}) assigned to Provider (ID: ${providerId})`);

    res.status(200).json({
      success: true,
      message: 'Service successfully assigned to provider.'
    });
  } catch (error) {
    next(error);
  }
};

// 7. REMOVE SERVICE FROM PROVIDER (Admin Only)
exports.unassignServiceFromProvider = async (req, res, next) => {
  try {
    const { providerId, serviceId } = req.body;

    const provider = await db.Provider.findByPk(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found.'
      });
    }

    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.'
      });
    }

    await provider.removeService(service);
    logger.info(`Service (ID: ${serviceId}) unassigned from Provider (ID: ${providerId})`);

    res.status(200).json({
      success: true,
      message: 'Service successfully unassigned from provider.'
    });
  } catch (error) {
    next(error);
  }
};
