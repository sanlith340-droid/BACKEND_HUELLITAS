const { Op } = require('sequelize');
const { Usuario } = require('../models');
const AppError = require('../utils/AppError');

const PREFIX = { usuario:'USU', especialista:'ESP', recepcionista:'REC', admin:'ADM' };

async function generarIdUsuario(rol) {
  const prefix = PREFIX[rol] || 'USU';
  const ultimo = await Usuario.findOne({
    where: { id_usuario: { [Op.like]: `${prefix}%` } },
    order: [['id_usuario', 'DESC']],
  });
  if (!ultimo) return `${prefix}001`;
  const num = parseInt(ultimo.id_usuario.replace(prefix, ''), 10) + 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

function sinPassword(inst) {
  const u = inst.toJSON ? inst.toJSON() : { ...inst };
  delete u.contrasena;
  return u;
}

async function login({ correo, contrasena }) {
  console.log('[auth.service] Login para:', correo);
  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) throw AppError.unauthorized('Credenciales inválidas. Verifica tu correo y contraseña.');
  if (contrasena !== usuario.contrasena) {
    throw AppError.unauthorized('Credenciales inválidas. Verifica tu correo y contraseña.');
  }
  return {
    usuario: sinPassword(usuario),
    token: `mock-token-${usuario.id_usuario}-${Date.now()}`,
  };
}

async function registro(datos) {
  const existe = await Usuario.findOne({ where: { correo: datos.correo } });
  if (existe) throw AppError.conflict('El correo electrónico ya está registrado');

  const id_usuario = await generarIdUsuario('usuario');
  const creado = await Usuario.create({
    id_usuario,
    nombre: datos.nombre,
    apellidos: datos.apellidos,
    telefono: datos.telefono,
    direccion: datos.direccion,
    correo: datos.correo,
    contrasena: datos.contrasena,
    especializacion: null,
    tipo: datos.tipo || 'principal',
    rol: 'usuario',
  });

  return { usuario: sinPassword(creado), token: `mock-token-${id_usuario}-${Date.now()}` };
}

async function registroAdmin(datos, adminId) {
  const admin = await Usuario.findByPk(adminId);
  if (!admin || admin.rol !== 'admin') {
    throw AppError.forbidden('Solo los administradores pueden crear cuentas de otros roles');
  }
  const existe = await Usuario.findOne({ where: { correo: datos.correo } });
  if (existe) throw AppError.conflict('El correo electrónico ya está registrado');

  const id_usuario = await generarIdUsuario(datos.rol);
  const creado = await Usuario.create({
    id_usuario,
    nombre: datos.nombre,
    apellidos: datos.apellidos,
    telefono: datos.telefono,
    direccion: datos.direccion,
    correo: datos.correo,
    contrasena: datos.contrasena,
    especializacion: datos.rol === 'especialista' ? datos.especializacion : null,
    tipo: null,
    rol: datos.rol,
  });

  return { usuario: sinPassword(creado), token: `mock-token-${id_usuario}-${Date.now()}` };
}

module.exports = { login, registro, registroAdmin };