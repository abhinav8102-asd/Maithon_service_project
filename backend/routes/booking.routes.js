const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { verifyToken, isCustomer } = require('../middlewares/auth.middleware');

// Create a new booking (Customer only)
router.post('/', verifyToken, isCustomer, bookingController.createBooking);

// View customer's booking history (Customer only)
router.get('/history/customer', verifyToken, isCustomer, bookingController.getCustomerBookings);

// Get single booking details (Customer/Provider/Admin)
router.get('/:id', verifyToken, bookingController.getBookingById);

// Update status of booking (Accept, Reject, Complete, Cancel)
router.put('/:id/status', verifyToken, bookingController.updateBookingStatus);

module.exports = router;
