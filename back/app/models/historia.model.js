const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistoriaClinica = sequelize.define('HistoriaClinica', {
  id_historia_clinica: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_cita:             { type: DataTypes.INTEGER, allowNull: false, unique: true },
  peso:                { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  diagnostico:         { type: DataTypes.STRING(200), allowNull: false },
  tratamiento:         { type: DataTypes.STRING(200), allowNull: false },
  observaciones:       { type: DataTypes.STRING(500), allowNull: true },
  fecha_registro:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'historia_clinica',
  timestamps: false,
});

module.exports = HistoriaClinica;