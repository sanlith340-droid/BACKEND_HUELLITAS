const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id_usuario:      { type: DataTypes.STRING(10),  primaryKey: true, allowNull: false },
  nombre:          { type: DataTypes.STRING(100), allowNull: false },
  apellidos:       { type: DataTypes.STRING(150), allowNull: false },
  telefono:        { type: DataTypes.STRING(20),  allowNull: true },
  correo:          { type: DataTypes.STRING(150), allowNull: false, unique: true },
  direccion:       { type: DataTypes.STRING(150), allowNull: false },
  contrasena:      { type: DataTypes.STRING(255), allowNull: false },
  especializacion: { type: DataTypes.STRING(100), allowNull: true },
  tipo:            { type: DataTypes.STRING(20),  allowNull: true },
  rol:             { type: DataTypes.STRING(20),  allowNull: false, defaultValue: 'usuario' },
  fecha_registro:  { type: DataTypes.DATE,        allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'usuario',
  timestamps: false,
});

module.exports = Usuario;