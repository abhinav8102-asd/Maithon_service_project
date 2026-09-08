const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const FAQ = sequelize.define('FAQ', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('General', 'Provider', 'Customer'),
    defaultValue: 'General'
  }
}, {
  tableName: 'faqs',
  timestamps: true
});

module.exports = FAQ;
