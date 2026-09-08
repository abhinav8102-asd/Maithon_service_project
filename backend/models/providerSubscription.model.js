const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ProviderSubscription = sequelize.define('ProviderSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  packageId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Expired'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'provider_subscriptions',
  timestamps: true
});

module.exports = ProviderSubscription;
