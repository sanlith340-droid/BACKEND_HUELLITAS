const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Raza = sequelize.define('Raza', {
  id_raza:        { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:         { type: DataTypes.STRING(200), allowNull: false },
  fecha_registro: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'raza',
  timestamps: false,
});

module.exports = Raza;