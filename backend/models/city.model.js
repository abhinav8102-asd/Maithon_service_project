const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const City = sequelize.define('City', {
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
  state: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'cities',
  timestamps: true
});

module.exports = City;
