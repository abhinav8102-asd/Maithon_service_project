const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Provider = sequelize.define('Provider', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  businessName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  skills: {
    type: DataTypes.JSON, // Array of strings: ["Wiring", "Switches", "AC Repair"]
    allowNull: true
  },
  languages: {
    type: DataTypes.JSON, // Array of strings: ["Hindi", "English", "Bengali"]
    allowNull: true
  },
  workingHours: {
    type: DataTypes.JSON, // Object: { start: "09:00", end: "18:00" }
    allowNull: true
  },
  availabilityStatus: {
    type: DataTypes.ENUM('Available', 'Busy', 'Offline'),
    defaultValue: 'Available'
  },
  pricing: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  kycStatus: {
    type: DataTypes.ENUM('Pending', 'Verified', 'Rejected'),
    defaultValue: 'Pending'
  },
  aadhaarPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  panPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  certificates: {
    type: DataTypes.JSON, // Array of certificate file paths
    allowNull: true
  },
  cityId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  areaId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'providers',
  timestamps: true
});

module.exports = Provider;
