const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Booking = sequelize.define('Booking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bookingDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  bookingTime: {
    type: DataTypes.STRING, // e.g. "10:00 - 12:00"
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Accepted', 'Rejected', 'Completed', 'Cancelled'),
    defaultValue: 'Pending'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false
  },
  statusTimeline: {
    type: DataTypes.JSON, // e.g. { pendingAt: Date, acceptedAt: Date, completedAt: Date }
    allowNull: true
  }
}, {
  tableName: 'bookings',
  timestamps: true
});

module.exports = Booking;
