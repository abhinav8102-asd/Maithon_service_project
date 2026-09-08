const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper to get Provider record by User ID
const findProviderByUserId = async (userId) => {
  const provider = await db.Provider.findOne({ 
    where: { userId },
    include: [{ model: db.User, attributes: ['name', 'email', 'phoneNumber'] }]
  });
  if (!provider) {
    const error = new Error('Provider profile not found.');
    error.statusCode = 404;
    throw error;
  }
  return provider;
};

// 1. GET PROVIDER PROFILE (Self)
exports.getProfile = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    res.status(200).json({
      success: true,
      data: provider
    });
  } catch (error) {
    next(error);
  }
};

// 2. UPDATE PROVIDER PROFILE (Self)
exports.updateProfile = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { 
      businessName, 
      experienceYears, 
      skills, 
      languages, 
      workingHours, 
      pricing,
      cityId,
      areaId
    } = req.body;

    if (businessName) provider.businessName = businessName;
    if (experienceYears !== undefined) provider.experienceYears = experienceYears;
    if (pricing !== undefined) provider.pricing = pricing;
    if (cityId) provider.cityId = cityId;
    if (areaId) provider.areaId = areaId;

    // Parse array variables
    if (skills) {
      provider.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
    }
    if (languages) {
      provider.languages = typeof languages === 'string' ? JSON.parse(languages) : languages;
    }
    if (workingHours) {
      provider.workingHours = typeof workingHours === 'string' ? JSON.parse(workingHours) : workingHours;
    }

    await provider.save();
    logger.info(`Provider profile updated for User ID: ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: provider
    });
  } catch (error) {
    next(error);
  }
};

// 3. UPLOAD KYC DOCUMENTS
exports.uploadKYC = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);

    if (!req.files || (!req.files.aadhaar && !req.files.pan)) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar card or PAN card file is required.'
      });
    }

    if (req.files.aadhaar) {
      provider.aadhaarPath = `/uploads/documents/${req.files.aadhaar[0].filename}`;
    }
    if (req.files.pan) {
      provider.panPath = `/uploads/documents/${req.files.pan[0].filename}`;
    }

    // Set KYC to pending status when files are uploaded/updated
    provider.kycStatus = 'Pending';
    await provider.save();

    logger.info(`KYC documents uploaded by provider ID: ${provider.id}`);

    res.status(200).json({
      success: true,
      message: 'KYC documents uploaded successfully and are pending review.',
      data: provider
    });
  } catch (error) {
    next(error);
  }
};

// 4. TOGGLE AVAILABILITY STATUS
exports.toggleAvailability = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { status } = req.body;

    if (!['Available', 'Busy', 'Offline'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availability status.'
      });
    }

    provider.availabilityStatus = status;
    await provider.save();
    logger.info(`Provider ID: ${provider.id} changed availability status to ${status}`);

    res.status(200).json({
      success: true,
      message: `Availability status updated to ${status}.`,
      data: { availabilityStatus: provider.availabilityStatus }
    });
  } catch (error) {
    next(error);
  }
};

// 5. GET PROVIDER DASHBOARD STATISTICS & EARNINGS
exports.getDashboardStats = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);

    // 1. Total bookings received
    const totalBookings = await db.Booking.count({ where: { providerId: provider.id } });

    // 2. Active (Pending / Accepted) bookings count
    const activeBookings = await db.Booking.count({
      where: {
        providerId: provider.id,
        status: { [Op.in]: ['Pending', 'Accepted'] }
      }
    });

    // 3. Completed bookings count
    const completedBookings = await db.Booking.count({
      where: { providerId: provider.id, status: 'Completed' }
    });

    // 4. Cancelled bookings count
    const cancelledBookings = await db.Booking.count({
      where: { providerId: provider.id, status: 'Cancelled' }
    });

    // 5. Total Earnings (Sum of price on completed bookings)
    const totalEarnings = await db.Booking.sum('price', {
      where: { providerId: provider.id, status: 'Completed' }
    }) || 0;

    // 6. Recent reviews list (limit 5)
    const reviews = await db.Review.findAll({
      where: { providerId: provider.id },
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ 
        model: db.Customer, 
        include: [{ model: db.User, attributes: ['name'] }] 
      }]
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings,
          activeBookings,
          completedBookings,
          cancelledBookings,
          totalEarnings: parseFloat(totalEarnings).toFixed(2)
        },
        reviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. GET PROVIDER BOOKING WORK HISTORY
exports.getBookings = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { status } = req.query;
    const filter = { providerId: provider.id };

    if (status) filter.status = status;

    const bookings = await db.Booking.findAll({
      where: filter,
      include: [
        { 
          model: db.Customer, 
          include: [{ model: db.User, attributes: ['name', 'email', 'phoneNumber'] }] 
        },
        { 
          model: db.Service, 
          attributes: ['id', 'name', 'price', 'durationMinutes'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// 7. GET PROVIDER SERVICES PORTFOLIO (Self)
exports.getProviderServices = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const providerServices = await db.ProviderService.findAll({
      where: { providerId: provider.id },
      include: [{ model: db.Service, attributes: ['id', 'name', 'categoryId'] }]
    });
    res.status(200).json({ success: true, data: providerServices });
  } catch (error) {
    next(error);
  }
};

// 8. ADD SERVICE TO PORTFOLIO (Self)
exports.addProviderService = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { serviceId, price } = req.body;

    const service = await db.Service.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service template not found.' });
    }

    const existing = await db.ProviderService.findOne({
      where: { providerId: provider.id, serviceId }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Service is already in your profile.' });
    }

    // Check active subscription limits
    const activeSub = await db.ProviderSubscription.findOne({
      where: { providerId: provider.id, status: 'Active' },
      include: [{ model: db.SubscriptionPackage }]
    });

    const maxLimit = activeSub && activeSub.SubscriptionPackage ? activeSub.SubscriptionPackage.maxServices : 2; // Default is 2
    const currentCount = await db.ProviderService.count({ where: { providerId: provider.id } });

    if (currentCount >= maxLimit) {
      return res.status(403).json({
        success: false,
        message: `Limit exceeded. Your active subscription allows a maximum of ${maxLimit} services. Please upgrade your plan.`
      });
    }

    const providerService = await db.ProviderService.create({
      providerId: provider.id,
      serviceId,
      price: parseFloat(price)
    });

    res.status(201).json({ success: true, message: 'Service added to your portfolio.', data: providerService });
  } catch (error) {
    next(error);
  }
};

// 9. UPDATE PORTFOLIO SERVICE PRICE (Self)
exports.updateProviderService = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { price } = req.body;
    const serviceId = req.params.serviceId;

    const providerService = await db.ProviderService.findOne({
      where: { providerId: provider.id, serviceId }
    });
    if (!providerService) {
      return res.status(404).json({ success: false, message: 'Service not found in your portfolio.' });
    }

    providerService.price = parseFloat(price);
    await providerService.save();

    res.status(200).json({ success: true, message: 'Service price updated successfully.', data: providerService });
  } catch (error) {
    next(error);
  }
};

// 10. REMOVE SERVICE FROM PORTFOLIO (Self)
exports.deleteProviderService = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const serviceId = req.params.serviceId;

    const providerService = await db.ProviderService.findOne({
      where: { providerId: provider.id, serviceId }
    });
    if (!providerService) {
      return res.status(404).json({ success: false, message: 'Service not found in your portfolio.' });
    }

    await providerService.destroy();
    res.status(200).json({ success: true, message: 'Service removed from your portfolio.' });
  } catch (error) {
    next(error);
  }
};

// 11. GET ACTIVE SUBSCRIPTION (Self)
exports.getActiveSubscription = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const subscription = await db.ProviderSubscription.findOne({
      where: { providerId: provider.id, status: 'Active' },
      include: [{ model: db.SubscriptionPackage }]
    });
    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// 12. PURCHASE SUBSCRIPTION PACKAGE (Self)
exports.purchaseSubscription = async (req, res, next) => {
  try {
    const provider = await findProviderByUserId(req.userId);
    const { packageId } = req.body;

    const pkg = await db.SubscriptionPackage.findByPk(packageId);
    if (!pkg || pkg.status !== 'Active') {
      return res.status(404).json({ success: false, message: 'Subscription plan not found or is inactive.' });
    }

    // Set any existing active plans to Expired
    await db.ProviderSubscription.update(
      { status: 'Expired' },
      { where: { providerId: provider.id, status: 'Active' } }
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + pkg.durationDays);

    const subscription = await db.ProviderSubscription.create({
      providerId: provider.id,
      packageId: pkg.id,
      startDate,
      endDate,
      status: 'Active'
    });

    logger.info(`Provider ID: ${provider.id} purchased subscription plan: ${pkg.name}`);
    res.status(201).json({ success: true, message: 'Subscription purchased successfully.', data: subscription });
  } catch (error) {
    next(error);
  }
};
