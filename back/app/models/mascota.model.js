const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Mascota = sequelize.define('Mascota', {
  id_mascota:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre:           { type: DataTypes.STRING(200), allowNull: false },
  fecha_nacimiento: { type: DataTypes.DATEONLY,    allowNull: false },
  especie:          { type: DataTypes.STRING(50),  allowNull: false },
  genero:           { type: DataTypes.STRING(20),  allowNull: false },
  id_raza:          { type: DataTypes.INTEGER,     allowNull: false },
  fecha_registro:   { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'mascota',
  timestamps: false,
});

module.exports = Mascota;