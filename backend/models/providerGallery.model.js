const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ProviderGallery = sequelize.define('ProviderGallery', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  providerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imagePath: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'provider_gallery',
  timestamps: true
});

module.exports = ProviderGallery;
