const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  banner: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seoTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seoDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Enabled', 'Disabled'),
    defaultValue: 'Enabled'
  }
}, {
  tableName: 'categories',
  timestamps: true
});

module.exports = Category;
