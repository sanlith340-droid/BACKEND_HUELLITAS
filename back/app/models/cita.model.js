const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cita = sequelize.define('Cita', {
  id_cita:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_recepcionista:  { type: DataTypes.STRING(10),  allowNull: false },
  id_mascota:        { type: DataTypes.INTEGER,     allowNull: false },
  id_disponibilidad: { type: DataTypes.INTEGER,     allowNull: false, unique: true },
  motivo:            { type: DataTypes.STRING(200), allowNull: false },
  estado:            { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'pendiente' },
}, {
  tableName: 'cita',
  timestamps: false,
});

module.exports = Cita;