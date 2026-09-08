const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true // 'Admin', 'Provider', 'Customer'
  }
}, {
  tableName: 'roles',
  timestamps: true
});

module.exports = Role;
