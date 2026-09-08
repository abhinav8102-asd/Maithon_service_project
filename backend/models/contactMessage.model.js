const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const ContactMessage = sequelize.define('ContactMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Resolved'),
    defaultValue: 'Pending'
  }
}, {
  tableName: 'contact_messages',
  timestamps: true
});

module.exports = ContactMessage;
