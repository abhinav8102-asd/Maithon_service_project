const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const SubscriptionPackage = sequelize.define('SubscriptionPackage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  durationDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  maxServices: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2 // Default basic limit
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Standard search visibility
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'subscription_packages',
  timestamps: true
});

module.exports = SubscriptionPackage;
