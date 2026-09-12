// app/models/index.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usuario         = require('./usuario.model');
const Raza            = require('./raza.model');
const Mascota         = require('./mascota.model');
const Disponibilidad  = require('./disponibilidad.model');
const Cita            = require('./cita.model');
const HistoriaClinica = require('./historia.model');

const UsuarioMascota = sequelize.define('UsuarioMascota', {
  id_usuario: { type: DataTypes.STRING(10), primaryKey: true },
  id_mascota: { type: DataTypes.INTEGER,    primaryKey: true },
}, {
  tableName: 'usuario_mascota',
  timestamps: false,
});

Usuario.belongsToMany(Mascota, {
  through: UsuarioMascota, foreignKey: 'id_usuario', otherKey: 'id_mascota', as: 'Mascotas',
});
Mascota.belongsToMany(Usuario, {
  through: UsuarioMascota, foreignKey: 'id_mascota', otherKey: 'id_usuario', as: 'Propietarios',
});

Raza.hasMany(Mascota, { foreignKey: 'id_raza' });
Mascota.belongsTo(Raza, { foreignKey: 'id_raza', as: 'Raza' });

Usuario.hasMany(Disponibilidad, { foreignKey: 'id_usuario' });
Disponibilidad.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'Especialista' });

Disponibilidad.hasOne(Cita, { foreignKey: 'id_disponibilidad' });
Cita.belongsTo(Disponibilidad, { foreignKey: 'id_disponibilidad', as: 'Disponibilidad' });

Mascota.hasMany(Cita, { foreignKey: 'id_mascota' });
Cita.belongsTo(Mascota, { foreignKey: 'id_mascota', as: 'Mascota' });

Usuario.hasMany(Cita, { foreignKey: 'id_recepcionista', as: 'CitasComoRecepcionista' });
Cita.belongsTo(Usuario, { foreignKey: 'id_recepcionista', as: 'Recepcionista' });

Cita.hasOne(HistoriaClinica, { foreignKey: 'id_cita' });
HistoriaClinica.belongsTo(Cita, { foreignKey: 'id_cita', as: 'Cita' });

module.exports = {
  sequelize,
  Usuario,
  Raza,
  Mascota,
  Disponibilidad,
  Cita,
  HistoriaClinica,
  UsuarioMascota,
};