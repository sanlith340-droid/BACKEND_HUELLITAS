const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Disponibilidad = sequelize.define('Disponibilidad', {
  id_disponibilidad: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_usuario:        { type: DataTypes.STRING(10), allowNull: false },
  fecha:             { type: DataTypes.DATEONLY,   allowNull: false },
  hora:              { type: DataTypes.TIME,       allowNull: false },
  estado:            { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'disponible' },
}, {
  tableName: 'disponibilidad',
  timestamps: false,
});

module.exports = Disponibilidad;