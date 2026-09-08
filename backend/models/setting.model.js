const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  facebookLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  instagramLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  privacyPolicy: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  termsConditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  heroSubtitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  heroTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  heroDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  heroBgImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  featuresJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  modulesJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  statsJson: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  workflowJson: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'system_settings',
  timestamps: true
});

module.exports = SystemSetting;
