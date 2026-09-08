const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Helper to get Customer record by User ID
const findCustomerByUserId = async (userId) => {
  const customer = await db.Customer.findOne({ where: { userId } });
  if (!customer) {
    const error = new Error('Customer profile not found.');
    error.statusCode = 404;
    throw error;
  }
  return customer;
};

// Helper to get Provider record by User ID
const findProviderByUserId = async (userId) => {
  const provider = await db.Provider.findOne({ where: { userId } });
  if (!provider) {
    const error = new Error('Provider profile not found.');
    error.statusCode = 404;
    throw error;
  }
  return provider;
};

// 1. CREATE BOOKING (Customer Only)
exports.createBooking = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const customer = await findCustomerByUserId(req.userId);
    const { providerId, serviceId, bookingDate, bookingTime, address, pincode, paymentMethod } = req.body;

    // Verify Provider exists and is verified
    const provider = await db.Provider.findByPk(providerId, {
      include: [{ model: db.User, attributes: ['name'] }]
    });
    if (!provider || provider.kycStatus !== 'Verified') {
      return res.status(400).json({
        success: false,
        message: 'The selected service provider is not verified or active.'
      });
    }

    // Verify Service exists
    const service = await db.Service.findByPk(serviceId);
    if (!service || service.status !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'The selected service is unavailable.'
      });
    }

    // Capture service pricing snapshot from custom provider rates, fallback to base template price
    const providerService = await db.ProviderService.findOne({
      where: { providerId, serviceId }
    });
    const price = providerService ? providerService.price : service.price;

    // Create Booking
    const timeline = { pendingAt: new Date() };
    const booking = await db.Booking.create({
      customerId: customer.id,
      providerId,
      serviceId,
      bookingDate,
      bookingTime,
      status: 'Pending',
      price,
      address,
      pincode,
      statusTimeline: timeline
    }, { transaction });

    // Create initial Pending Payment record
    await db.Payment.create({
      bookingId: booking.id,
      amount: price,
      paymentMethod: paymentMethod || 'Cash',
      status: 'Pending'
    }, { transaction });

    // Notify Provider
    await db.Notification.create({
      userId: provider.userId,
      title: 'New Service Request',
      message: `You have received a new request for "${service.name}" from ${req.body.customerName || 'a Customer'} on ${bookingDate}.`,
      type: 'Booking',
      isRead: false
    }, { transaction });

    await transaction.commit();
    logger.info(`Booking ID: ${booking.id} created by Customer ID: ${customer.id}`);

    res.status(201).json({
      success: true,
      message: 'Booking request sent successfully to the provider.',
      data: booking
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// 2. GET BOOKING BY ID
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await db.Booking.findByPk(req.params.id, {
      include: [
        { 
          model: db.Customer, 
          include: [{ model: db.User, attributes: ['name', 'email', 'phoneNumber'] }] 
        },
        { 
          model: db.Provider, 
          include: [{ model: db.User, attributes: ['name', 'email', 'phoneNumber'] }] 
        },
        { model: db.Service },
        { model: db.Payment }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    // Role-based auth verification (Only linked Customer, Provider, or Admin can see it)
    const userRole = req.userRole;
    if (userRole === 'Customer') {
      const customer = await findCustomerByUserId(req.userId);
      if (booking.customerId !== customer.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
      }
    } else if (userRole === 'Provider') {
      const provider = await findProviderByUserId(req.userId);
      if (booking.providerId !== provider.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized access.' });
      }
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// 3. UPDATE BOOKING STATUS (Accept, Reject, Complete, Cancel)
exports.updateBookingStatus = async (req, res, next) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { status } = req.body; // 'Accepted', 'Rejected', 'Completed', 'Cancelled'
    const bookingId = req.params.id;

    const booking = await db.Booking.findByPk(bookingId, {
      include: [
        { model: db.Customer, include: [{ model: db.User, attributes: ['id', 'name'] }] },
        { model: db.Provider, include: [{ model: db.User, attributes: ['id', 'name'] }] },
        { model: db.Service, attributes: ['name'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.'
      });
    }

    const currentStatus = booking.status;
    const userRole = req.userRole;
    const timeline = { ...booking.statusTimeline };

    // Validations based on transition rules
    if (status === 'Accepted' || status === 'Rejected') {
      // Only Provider can Accept/Reject and it must be currently 'Pending'
      if (userRole !== 'Provider') {
        return res.status(403).json({ success: false, message: 'Only providers can accept or reject bookings.' });
      }
      if (currentStatus !== 'Pending') {
        return res.status(400).json({ success: false, message: `Cannot change booking state from ${currentStatus} to ${status}.` });
      }

      const provider = await findProviderByUserId(req.userId);
      if (booking.providerId !== provider.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this booking.' });
      }

      booking.status = status;
      timeline[status === 'Accepted' ? 'acceptedAt' : 'rejectedAt'] = new Date();

      // Notify Customer
      await db.Notification.create({
        userId: booking.Customer.User.id,
        title: `Booking Request ${status}`,
        message: `Your booking request for "${booking.Service.name}" has been ${status.toLowerCase()} by provider ${booking.Provider.User.name}.`,
        type: 'Booking'
      }, { transaction });

    } else if (status === 'Completed') {
      // Only Provider can Complete and it must be 'Accepted'
      if (userRole !== 'Provider') {
        return res.status(403).json({ success: false, message: 'Only providers can mark bookings as completed.' });
      }
      if (currentStatus !== 'Accepted') {
        return res.status(400).json({ success: false, message: 'Can only complete bookings that have been accepted.' });
      }

      const provider = await findProviderByUserId(req.userId);
      if (booking.providerId !== provider.id) {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this booking.' });
      }

      booking.status = 'Completed';
      timeline.completedAt = new Date();

      // Auto-update Payment to Paid (cash collected on completion)
      const payment = await db.Payment.findOne({ where: { bookingId } });
      if (payment) {
        payment.status = 'Paid';
        await payment.save({ transaction });
      }

      // Notify Customer
      await db.Notification.create({
        userId: booking.Customer.User.id,
        title: 'Service Completed',
        message: `Your service "${booking.Service.name}" has been completed. Please rate the provider!`,
        type: 'Booking'
      }, { transaction });

    } else if (status === 'Cancelled') {
      // Customers can cancel Pending/Accepted. Admin can cancel anytime.
      if (userRole === 'Customer') {
        const customer = await findCustomerByUserId(req.userId);
        if (booking.customerId !== customer.id) {
          return res.status(403).json({ success: false, message: 'Unauthorized access.' });
        }
        if (!['Pending', 'Accepted'].includes(currentStatus)) {
          return res.status(400).json({ success: false, message: 'Cannot cancel booking at this stage.' });
        }
      } else if (userRole !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking.' });
      }

      booking.status = 'Cancelled';
      timeline.cancelledAt = new Date();

      // Notify the other party
      const notifyUserId = userRole === 'Customer' ? booking.Provider.User.id : booking.Customer.User.id;
      const cancelledBy = userRole === 'Customer' ? 'the Customer' : 'Administrator';

      await db.Notification.create({
        userId: notifyUserId,
        title: 'Booking Cancelled',
        message: `Booking for "${booking.Service.name}" was cancelled by ${cancelledBy}.`,
        type: 'Booking'
      }, { transaction });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid status request.' });
    }

    booking.statusTimeline = timeline;
    await booking.save({ transaction });

    await transaction.commit();
    logger.info(`Booking ID: ${bookingId} status updated to ${status} by ${userRole}`);

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: booking
    });

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

// 4. GET CUSTOMER BOOKING HISTORY
exports.getCustomerBookings = async (req, res, next) => {
  try {
    const customer = await findCustomerByUserId(req.userId);
    const { status } = req.query;
    const filter = { customerId: customer.id };

    if (status) filter.status = status;

    const bookings = await db.Booking.findAll({
      where: filter,
      include: [
        {
          model: db.Provider,
          include: [{ model: db.User, attributes: ['name', 'phoneNumber'] }]
        },
        { model: db.Service, attributes: ['name', 'price', 'durationMinutes'] },
        { model: db.Payment, attributes: ['status', 'paymentMethod'] }
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
