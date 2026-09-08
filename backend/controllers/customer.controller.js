const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper to get Customer record by User ID
const findCustomerByUserId = async (userId) => {
  const customer = await db.Customer.findOne({
    where: { userId },
    include: [{ model: db.User, attributes: ['name', 'email', 'phoneNumber'] }]
  });
  if (!customer) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    throw error;
  }
  return customer;
};

// 1. GET CUSTOMER PROFILE (Self)
exports.getProfile = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);
    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// 2. UPDATE CUSTOMER PROFILE (Self)
exports.updateProfile = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);
    const { address, cityId, areaId } = req.body;

    if (address) customer.address = address;
    if (cityId) customer.cityId = cityId;
    if (areaId) customer.areaId = areaId;

    if (req.file) {
      customer.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    await customer.save();
    logger.info(`Customer profile updated for User ID: ${req.userId}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// 3. SEARCH & FILTER PROVIDERS
exports.searchProviders = async (req, res, next) => {
  try {
    const { categoryId, cityId, areaId, name, minPrice, maxPrice } = req.query;

    const providerFilter = { kycStatus: 'Verified' }; // Show verified providers only
    const userFilter = {};
    const serviceFilter = {};

    if (cityId) providerFilter.cityId = cityId;
    if (areaId) providerFilter.areaId = areaId;

    if (name) {
      providerFilter[Op.or] = [
        { businessName: { [Op.like]: `%${name}%` } },
        { '$User.name$': { [Op.like]: `%${name}%` } }
      ];
    }

    if (minPrice || maxPrice) {
      providerFilter.pricing = {};
      if (minPrice) providerFilter.pricing[Op.gte] = parseFloat(minPrice);
      if (maxPrice) providerFilter.pricing[Op.lte] = parseFloat(maxPrice);
    }

    // Include filters for category if selected
    const includeConfig = [
      {
        model: db.User,
        where: userFilter,
        attributes: ['name', 'email', 'phoneNumber']
      },
      { model: db.City, attributes: ['id', 'name'] },
      { model: db.Area, attributes: ['id', 'name', 'pincode'] },
      {
        model: db.Service,
        as: 'services',
        where: categoryId ? { categoryId } : {},
        attributes: ['id', 'name', 'price'],
        required: categoryId ? true : false // If searching by category, provider must have services matching it
      },
      {
        model: db.Review,
        attributes: ['rating']
      },
      {
        model: db.ProviderSubscription,
        required: false,
        where: { status: 'Active' },
        include: [{ model: db.SubscriptionPackage, attributes: ['isFeatured', 'name'] }]
      }
    ];

    const providers = await db.Provider.findAll({
      where: providerFilter,
      include: includeConfig
    });

    // Calculate rating averages dynamically
    const formattedProviders = providers.map(p => {
      const pJson = p.toJSON();
      const ratings = pJson.Reviews || [];
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      // Extract custom prices from the pivot table
      if (pJson.services) {
        pJson.services = pJson.services.map(s => ({
          id: s.id,
          name: s.name,
          price: s.ProviderService ? parseFloat(s.ProviderService.price) : s.price,
          categoryId: s.categoryId
        }));

        // Dynamically show the minimum active price as their base pricing
        if (pJson.services.length > 0) {
          const prices = pJson.services.map(s => s.price);
          pJson.pricing = Math.min(...prices);
        }
      }

      // Check featured status from active subscription packages
      const activeSub = pJson.ProviderSubscriptions && pJson.ProviderSubscriptions[0];
      const isFeatured = activeSub && activeSub.SubscriptionPackage ? activeSub.SubscriptionPackage.isFeatured : false;

      delete pJson.Reviews; // Clean output
      delete pJson.ProviderSubscriptions; // Clean output

      return {
        ...pJson,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: ratings.length,
        isFeatured
      };
    });

    // Sort featured providers first, then by rating
    formattedProviders.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return b.averageRating - a.averageRating;
    });

    res.status(200).json({
      success: true,
      data: formattedProviders
    });

  } catch (error) {
    next(error);
  }
};

// 4. GET PROVIDER DETAILS (For Customer View)
exports.getProviderDetails = async (req, res, next) => {
  try {
    const providerId = req.params.id;

    const provider = await db.Provider.findByPk(providerId, {
      include: [
        { model: db.User, attributes: ['name', 'email', 'phoneNumber'] },
        { model: db.City, attributes: ['id', 'name'] },
        { model: db.Area, attributes: ['id', 'name', 'pincode'] },
        { model: db.Service, as: 'services' },
        { model: db.ProviderGallery, attributes: ['id', 'imagePath'] },
        {
          model: db.Review,
          where: { status: 'Approved' },
          required: false,
          include: [{
            model: db.Customer,
            include: [{ model: db.User, attributes: ['name'] }]
          }]
        }
      ]
    });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Service Provider not found.'
      });
    }

    const reviews = provider.Reviews || [];
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.status(200).json({
      success: true,
      data: {
        provider,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: reviews.length
      }
    });

  } catch (error) {
    next(error);
  }
};

// 5. BOOKMARK / FAVORITE A PROVIDER
exports.toggleFavorite = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);
    const { providerId } = req.body;

    const provider = await db.Provider.findByPk(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found.'
      });
    }

    const existingFavorite = await db.Favorite.findOne({
      where: { customerId: customer.id, providerId }
    });

    if (existingFavorite) {
      await existingFavorite.destroy();
      return res.status(200).json({
        success: true,
        message: 'Provider removed from favorites.'
      });
    } else {
      await db.Favorite.create({
        customerId: customer.id,
        providerId
      });
      return res.status(200).json({
        success: true,
        message: 'Provider added to favorites.'
      });
    }
  } catch (error) {
    next(error);
  }
};

// 6. GET FAVORITES LIST
exports.getFavorites = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);

    const favorites = await db.Favorite.findAll({
      where: { customerId: customer.id },
      include: [{
        model: db.Provider,
        include: [
          { model: db.User, attributes: ['name', 'email'] },
          { model: db.City, attributes: ['name'] },
          { model: db.Area, attributes: ['name'] }
        ]
      }]
    });

    res.status(200).json({
      success: true,
      data: favorites
    });
  } catch (error) {
    next(error);
  }
};

// 7. POST RATING AND REVIEW FOR A BOOKING
exports.postReview = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);
    const { bookingId, rating, comment } = req.body;

    // Check if booking belongs to customer and is completed
    const booking = await db.Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    if (booking.customerId !== customer.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized. You cannot review this booking.'
      });
    }

    if (booking.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only review completed service bookings.'
      });
    }

    // Check if review already exists
    const existingReview = await db.Review.findOne({ where: { bookingId } });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking.'
      });
    }

    const review = await db.Review.create({
      bookingId,
      customerId: customer.id,
      providerId: booking.providerId,
      rating,
      comment,
      status: 'Approved'
    });

    logger.info(`Review submitted for booking ID: ${bookingId}`);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review
    });

  } catch (error) {
    next(error);
  }
};

// 8. CONTACT SUPPORT / SUBMIT QUERY MESSAGE
exports.contactSupport = async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    const contact = await db.ContactMessage.create({
      name,
      email,
      message,
      status: 'Pending'
    });

    logger.info(`Contact message received from ${email}`);

    res.status(201).json({
      success: true,
      message: 'Your message has been submitted. Support team will get back to you.',
      data: contact
    });
  } catch (error) {
    next(error);
  }
};
