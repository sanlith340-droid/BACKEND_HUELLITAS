const { Disponibilidad, Usuario } = require('../models');
const AppError = require('../utils/AppError');

const INCLUDE_ESP = [{
  model: Usuario, as: 'Especialista',
  attributes: ['id_usuario','nombre','apellidos','especializacion'],
}];

function transformar(d) {
  const p = d.toJSON();
  return {
    id_disponibilidad: p.id_disponibilidad,
    id_usuario: p.id_usuario,
    fecha: p.fecha,
    hora: p.hora,
    estado: p.estado,
    especialista_nombre: p.Especialista?.nombre,
    especialista_apellidos: p.Especialista?.apellidos,
    especializacion: p.Especialista?.especializacion,
  };
}

async function listar(filtros = {}) {
  const where = {};
  if (filtros.id_usuario) where.id_usuario = filtros.id_usuario;
  if (filtros.fecha)      where.fecha = filtros.fecha;
  if (filtros.estado)     where.estado = filtros.estado;

  const datos = await Disponibilidad.findAll({
    where, include: INCLUDE_ESP,
    order: [['fecha','ASC'], ['hora','ASC']],
  });
  return datos.map(transformar);
}

async function obtenerPorId(id) {
  const d = await Disponibilidad.findByPk(id, { include: INCLUDE_ESP });
  if (!d) throw AppError.notFound(`No existe disponibilidad con id ${id}`);
  return transformar(d);
}

async function crear(datos) {
  const esp = await Usuario.findOne({ where: { id_usuario: datos.id_usuario, rol: 'especialista' } });
  if (!esp) throw AppError.badRequest(`El usuario ${datos.id_usuario} no es un especialista`);

  const dup = await Disponibilidad.findOne({
    where: { id_usuario: datos.id_usuario, fecha: datos.fecha, hora: datos.hora },
  });
  if (dup) throw AppError.conflict('El especialista ya tiene una disponibilidad para esa fecha y hora');

  const creada = await Disponibilidad.create({
    id_usuario: datos.id_usuario,
    fecha: datos.fecha,
    hora: datos.hora,
    estado: datos.estado || 'disponible',
  });
  return obtenerPorId(creada.id_disponibilidad);
}

async function actualizar(id, cambios) {
  const actual = await Disponibilidad.findByPk(id);
  if (!actual) throw AppError.notFound(`No existe disponibilidad con id ${id}`);

  const cambiaHorario =
    cambios.fecha !== undefined ||
    cambios.hora !== undefined ||
    cambios.id_usuario !== undefined;

  if (actual.estado === 'ocupado' && cambiaHorario) {
    throw AppError.conflict('No se puede modificar fecha, hora o especialista de una disponibilidad ocupada');
  }
  if (cambios.id_usuario) {
    const esp = await Usuario.findOne({ where: { id_usuario: cambios.id_usuario, rol: 'especialista' } });
    if (!esp) throw AppError.badRequest('El nuevo usuario no es un especialista');
  }
  await actual.update(cambios);
  return obtenerPorId(id);
}

async function eliminar(id) {
  const actual = await Disponibilidad.findByPk(id);
  if (!actual) throw AppError.notFound(`No existe disponibilidad con id ${id}`);
  if (actual.estado === 'ocupado') throw AppError.conflict('No se puede eliminar una disponibilidad ocupada');
  await actual.destroy();
}

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };