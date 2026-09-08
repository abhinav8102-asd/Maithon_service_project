const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 1. GET ADMIN DASHBOARD ANALYTICS
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Calculate dates for current month
    const date = new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);

    // Queries
    const totalUsers = await db.User.count();
    const totalProviders = await db.Provider.count();
    const pendingProviders = await db.Provider.count({ where: { kycStatus: 'Pending' } });
    const verifiedProviders = await db.Provider.count({ where: { kycStatus: 'Verified' } });
    
    const totalBookings = await db.Booking.count();
    const bookingsToday = await db.Booking.count({ where: { bookingDate: today } });
    const bookingsThisMonth = await db.Booking.count({
      where: {
        createdAt: { [Op.gte]: firstDayOfMonth }
      }
    });

    const completedBookings = await db.Booking.count({ where: { status: 'Completed' } });
    const cancelledBookings = await db.Booking.count({ where: { status: 'Cancelled' } });
    
    // Revenue calculations (15% platform commission)
    const grossRevenue = await db.Booking.sum('price', { where: { status: 'Completed' } }) || 0;
    const platformCommission = parseFloat(grossRevenue) * 0.15;

    // Get recent 10 bookings
    const recentBookings = await db.Booking.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.Customer, include: [{ model: db.User, attributes: ['name'] }] },
        { model: db.Provider, include: [{ model: db.User, attributes: ['name'] }] },
        { model: db.Service, attributes: ['name', 'price'] }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalProviders,
          pendingProviders,
          verifiedProviders,
          totalBookings,
          bookingsToday,
          bookingsThisMonth,
          completedBookings,
          cancelledBookings,
          grossRevenue: parseFloat(grossRevenue).toFixed(2),
          platformCommission: parseFloat(platformCommission).toFixed(2)
        },
        recentBookings
      }
    });

  } catch (error) {
    next(error);
  }
};

// 2. GET ALL USERS (Paginated & Filtered)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const filter = {};
    const roleFilter = {};

    if (status) filter.status = status;
    if (role) roleFilter.name = role; // e.g. 'Customer', 'Provider', 'Admin'

    if (search) {
      filter[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phoneNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await db.User.findAndCountAll({
      where: filter,
      include: [{ 
        model: db.Role, 
        where: Object.keys(roleFilter).length > 0 ? roleFilter : undefined,
        attributes: ['name']
      }],
      attributes: { exclude: ['passwordHash'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        users: rows,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
      }
    });

  } catch (error) {
    next(error);
  }
};

// 3. TOGGLE USER ACCOUNT STATUS (Suspend, Activate, Deactivate)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'Active', 'Inactive', 'Suspended'
    const userId = req.params.id;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status type.'
      });
    }

    const user = await db.User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    user.status = status;
    await user.save();
    logger.info(`User ID: ${userId} status changed to ${status} by admin.`);

    res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}.`,
      data: { id: user.id, status: user.status }
    });

  } catch (error) {
    next(error);
  }
};

// 4. GET ALL PROVIDERS FOR VERIFICATION
exports.getProviders = async (req, res, next) => {
  try {
    const { kycStatus } = req.query;
    const filter = {};
    if (kycStatus) filter.kycStatus = kycStatus;

    const providers = await db.Provider.findAll({
      where: filter,
      include: [
        { model: db.User, attributes: ['name', 'email', 'phoneNumber', 'status'] },
        { model: db.City, attributes: ['name'] },
        { model: db.Area, attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: providers
    });
  } catch (error) {
    next(error);
  }
};

// 5. VERIFY / APPROVE PROVIDER KYC
exports.verifyProvider = async (req, res, next) => {
  try {
    const { kycStatus } = req.body; // 'Verified', 'Rejected'
    const providerId = req.params.id;

    if (!['Verified', 'Rejected'].includes(kycStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status.'
      });
    }

    const provider = await db.Provider.findByPk(providerId, {
      include: [{ model: db.User, attributes: ['id', 'name'] }]
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found.'
      });
    }

    provider.kycStatus = kycStatus;
    await provider.save();

    // Send Notification to Provider
    await db.Notification.create({
      userId: provider.User.id,
      title: `KYC Verification ${kycStatus}`,
      message: kycStatus === 'Verified' 
        ? 'Congratulations! Your profile has been verified. You can now accept booking requests.'
        : 'Your KYC verification request has been rejected. Please re-upload valid documents.',
      type: 'KYC'
    });

    logger.info(`Provider ID: ${providerId} KYC updated to ${kycStatus}`);

    res.status(200).json({
      success: true,
      message: `Provider KYC verification set to ${kycStatus}.`,
      data: provider
    });

  } catch (error) {
    next(error);
  }
};

// 6. ADD CITY
exports.addCity = async (req, res, next) => {
  try {
    const { name, state } = req.body;
    
    const existing = await db.City.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'City already exists.' });
    }

    const city = await db.City.create({ name, state });
    res.status(201).json({ success: true, message: 'City added successfully.', data: city });
  } catch (error) {
    next(error);
  }
};

// 7. ADD AREA TO CITY
exports.addArea = async (req, res, next) => {
  try {
    const { cityId, name, pincode } = req.body;

    const city = await db.City.findByPk(cityId);
    if (!city) {
      return res.status(404).json({ success: false, message: 'Parent City not found.' });
    }

    const area = await db.Area.create({ cityId, name, pincode });
    res.status(201).json({ success: true, message: 'Area added successfully.', data: area });
  } catch (error) {
    next(error);
  }
};

// 8. GET ALL CITIES & AREAS LIST
exports.getCitiesAndAreas = async (req, res, next) => {
  try {
    const locations = await db.City.findAll({
      include: [{ model: db.Area }],
      order: [['name', 'ASC'], [{ model: db.Area }, 'name', 'ASC']]
    });
    res.status(200).json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
};

// 9. GET SUPPORT MESSAGES
exports.getSupportMessages = async (req, res, next) => {
  try {
    const messages = await db.ContactMessage.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

// 10. RESOLVE SUPPORT MESSAGE
exports.resolveSupportMessage = async (req, res, next) => {
  try {
    const message = await db.ContactMessage.findByPk(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    message.status = 'Resolved';
    await message.save();

    res.status(200).json({ success: true, message: 'Support message marked as resolved.', data: message });
  } catch (error) {
    next(error);
  }
};

// 11. GET ALL BOOKINGS (Admin Only)
exports.getBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const bookings = await db.Booking.findAll({
      where: filter,
      include: [
        { model: db.Customer, include: [{ model: db.User, attributes: ['name'] }] },
        { model: db.Provider, include: [{ model: db.User, attributes: ['name'] }] },
        { model: db.Service, attributes: ['name', 'price'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    next(error);
  }
};

// 12. CREATE ANOTHER ADMIN DYNAMICALLY (Admin Only)
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const bcrypt = require('bcryptjs');

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already registered.'
      });
    }

    // Get Admin Role
    const adminRole = await db.Role.findOne({ where: { name: 'Admin' } });
    if (!adminRole) {
      return res.status(500).json({
        success: false,
        message: 'Admin role is not configured in database.'
      });
    }

    // Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Admin User
    const newAdmin = await db.User.create({
      roleId: adminRole.id,
      name,
      email,
      passwordHash,
      phoneNumber,
      status: 'Active'
    });

    logger.info(`New Admin account created dynamically by Admin ID: ${req.userId} -> ${email}`);

    res.status(201).json({
      success: true,
      message: 'New Admin account created successfully.',
      data: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: 'Admin'
      }
    });

  } catch (error) {
    next(error);
  }
};

// 13. GET ALL SUBSCRIPTION PACKAGES (Admin View)
exports.getSubscriptionPackages = async (req, res, next) => {
  try {
    const packages = await db.SubscriptionPackage.findAll({
      order: [['price', 'ASC']]
    });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
};

// 14. GET ACTIVE SUBSCRIPTION PACKAGES (Public/Provider View)
exports.getActivePackagesPublic = async (req, res, next) => {
  try {
    const packages = await db.SubscriptionPackage.findAll({
      where: { status: 'Active' },
      order: [['price', 'ASC']]
    });
    res.status(200).json({ success: true, data: packages });
  } catch (error) {
    next(error);
  }
};

// 15. CREATE SUBSCRIPTION PACKAGE (Admin Only)
exports.createSubscriptionPackage = async (req, res, next) => {
  try {
    const { name, price, durationDays, description, maxServices, isFeatured } = req.body;
    const pkg = await db.SubscriptionPackage.create({
      name,
      price,
      durationDays,
      description,
      maxServices: maxServices !== undefined ? parseInt(maxServices, 10) : 2,
      isFeatured: isFeatured !== undefined ? !!isFeatured : false,
      status: 'Active'
    });
    logger.info(`Subscription package created by Admin ID: ${req.userId} -> ${name}`);
    res.status(201).json({ success: true, message: 'Subscription package created successfully.', data: pkg });
  } catch (error) {
    next(error);
  }
};

// 16. UPDATE SUBSCRIPTION PACKAGE (Admin Only)
exports.updateSubscriptionPackage = async (req, res, next) => {
  try {
    const { name, price, durationDays, description, maxServices, isFeatured, status } = req.body;
    const pkg = await db.SubscriptionPackage.findByPk(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Subscription package not found.' });
    }
    if (name) pkg.name = name;
    if (price !== undefined) pkg.price = price;
    if (durationDays !== undefined) pkg.durationDays = parseInt(durationDays, 10);
    if (description !== undefined) pkg.description = description;
    if (maxServices !== undefined) pkg.maxServices = parseInt(maxServices, 10);
    if (isFeatured !== undefined) pkg.isFeatured = !!isFeatured;
    if (status) pkg.status = status;

    await pkg.save();
    logger.info(`Subscription package ID: ${pkg.id} updated by Admin.`);
    res.status(200).json({ success: true, message: 'Subscription package updated successfully.', data: pkg });
  } catch (error) {
    next(error);
  }
};

// 17. DELETE SUBSCRIPTION PACKAGE (Admin Only)
exports.deleteSubscriptionPackage = async (req, res, next) => {
  try {
    const pkg = await db.SubscriptionPackage.findByPk(req.params.id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Subscription package not found.' });
    }
    
    // Check if any provider has this package active
    const count = await db.ProviderSubscription.count({ where: { packageId: pkg.id, status: 'Active' } });
    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete package. Active provider subscriptions are linked to it. You can set status to Inactive instead.'
      });
    }

    await pkg.destroy();
    logger.info(`Subscription package ID: ${req.params.id} deleted by Admin.`);
    res.status(200).json({ success: true, message: 'Subscription package deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
