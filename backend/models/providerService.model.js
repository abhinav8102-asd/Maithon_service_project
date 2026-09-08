const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ProviderService = sequelize.define('ProviderService', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'provider_services',
  timestamps: true
});

module.exports = ProviderService;
