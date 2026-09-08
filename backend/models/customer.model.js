const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  profilePicture: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
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
  tableName: 'customers',
  timestamps: true
});

module.exports = Customer;
