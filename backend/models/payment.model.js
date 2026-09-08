const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bookingId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING, // "Cash", "UPI", "Card"
    defaultValue: "Cash"
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Paid', 'Refunded'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'payments',
  timestamps: true
});

module.exports = Payment;
