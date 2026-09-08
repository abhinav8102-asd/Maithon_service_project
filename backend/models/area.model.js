const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Area = sequelize.define('Area', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pincode: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'areas',
  timestamps: true
});

module.exports = Area;
