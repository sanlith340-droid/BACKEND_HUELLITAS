const {
  Cita, Mascota, Disponibilidad, Usuario, UsuarioMascota, sequelize,
} = require('../models');
const AppError = require('../utils/AppError');

function transformar(c) {
  const p = c.toJSON();
  const d = p.Disponibilidad;
  const e = d?.Especialista;
  return {
    id_cita: p.id_cita,
    id_recepcionista: p.id_recepcionista,
    id_mascota: p.id_mascota,
    id_disponibilidad: p.id_disponibilidad,
    motivo: p.motivo,
    estado: p.estado,
    mascota_nombre: p.Mascota?.nombre,
    mascota_especie: p.Mascota?.especie,
    mascota_genero: p.Mascota?.genero,
    fecha_cita: d?.fecha,
    hora_cita: d?.hora,
    disponibilidad_estado: d?.estado,
    id_especialista: d?.id_usuario,
    especialista_nombre: e?.nombre,
    especialista_apellidos: e?.apellidos,
    especializacion: e?.especializacion,
    recepcionista_nombre: p.Recepcionista?.nombre,
    recepcionista_apellidos: p.Recepcionista?.apellidos,
  };
}

const INCLUDE = [
  { model: Mascota, as: 'Mascota' },
  { model: Disponibilidad, as: 'Disponibilidad',
    include: [{ model: Usuario, as: 'Especialista',
      attributes: ['id_usuario','nombre','apellidos','especializacion'] }] },
  { model: Usuario, as: 'Recepcionista',
    attributes: ['id_usuario','nombre','apellidos'] },
];

async function obtenerPorId(id) {
  const c = await Cita.findByPk(id, { include: INCLUDE });
  if (!c) throw AppError.notFound(`No existe cita con id ${id}`);
  return transformar(c);
}

async function listar(filtros = {}) {
  const where = {};
  const dispWhere = {};
  if (filtros.id_mascota)      where.id_mascota = filtros.id_mascota;
  if (filtros.estado)          where.estado = filtros.estado;
  if (filtros.fecha)           dispWhere.fecha = filtros.fecha;
  if (filtros.id_especialista) dispWhere.id_usuario = filtros.id_especialista;

  const include = [
    { model: Mascota, as: 'Mascota' },
    {
      model: Disponibilidad, as: 'Disponibilidad',
      ...(Object.keys(dispWhere).length ? { where: dispWhere } : {}),
      include: [{ model: Usuario, as: 'Especialista',
        attributes: ['id_usuario','nombre','apellidos','especializacion'] }],
    },
    { model: Usuario, as: 'Recepcionista',
      attributes: ['id_usuario','nombre','apellidos'] },
  ];

  const citas = await Cita.findAll({
    where,
    include,
    order: [
      [{ model: Disponibilidad, as: 'Disponibilidad' }, 'fecha', 'DESC'],
      [{ model: Disponibilidad, as: 'Disponibilidad' }, 'hora', 'DESC'],
    ],
  });
  return citas.map(transformar);
}

async function listarPorEspecialista(id_especialista) {
  const esp = await Usuario.findOne({ where: { id_usuario: id_especialista, rol: 'especialista' } });
  if (!esp) throw AppError.notFound(`No existe especialista con ID ${id_especialista}`);
  return listar({ id_especialista });
}

async function mascotaPerteneceAUsuario(id_mascota, id_usuario) {
  const link = await UsuarioMascota.findOne({ where: { id_mascota, id_usuario } });
  return Boolean(link);
}

async function crear({ id_mascota, id_disponibilidad, motivo, solicitante }) {
  const mascota = await Mascota.findByPk(id_mascota);
  if (!mascota) throw AppError.notFound(`No existe la mascota con id ${id_mascota}`);

  if (solicitante.rol === 'usuario') {
    const ok = await mascotaPerteneceAUsuario(id_mascota, solicitante.id);
    if (!ok) throw AppError.forbidden('La mascota no pertenece al usuario autenticado');
  }

  let id_recepcionista = solicitante.id;
  if (solicitante.rol !== 'recepcionista') {
    const rec = await Usuario.findOne({
      where: { rol: 'recepcionista' },
      order: [['id_usuario', 'ASC']],
    });
    if (!rec) throw AppError.badRequest('No existe un recepcionista registrado para crear la cita');
    id_recepcionista = rec.id_usuario;
  }

  const nueva = await sequelize.transaction(async (t) => {
    const d = await Disponibilidad.findByPk(id_disponibilidad, {
      transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!d) throw AppError.notFound(`No existe disponibilidad con id ${id_disponibilidad}`);
    if (d.estado !== 'disponible') throw AppError.conflict('La disponibilidad ya está ocupada');

    return Cita.create({
      id_recepcionista,
      id_mascota,
      id_disponibilidad,
      motivo,
      estado: 'pendiente',
    }, { transaction: t });
  });

  return obtenerPorId(nueva.id_cita);
}

async function editar(id_cita, cambios, solicitante) {
  const cita = await Cita.findByPk(id_cita);
  if (!cita) throw AppError.notFound(`No existe cita con id ${id_cita}`);

  if (solicitante.rol === 'usuario') {
    const ok = await mascotaPerteneceAUsuario(cita.id_mascota, solicitante.id);
    if (!ok) throw AppError.forbidden('No tienes permiso para modificar esta cita porque no te pertenece');
  }

  await sequelize.transaction(async (t) => {
    if (cambios.id_disponibilidad && cambios.id_disponibilidad !== cita.id_disponibilidad) {
      const nueva = await Disponibilidad.findByPk(cambios.id_disponibilidad, {
        transaction: t, lock: t.LOCK.UPDATE,
      });
      if (!nueva) throw AppError.notFound('La nueva disponibilidad no existe');
      if (nueva.estado !== 'disponible') throw AppError.conflict('La nueva disponibilidad no está disponible');

      await Disponibilidad.update({ estado: 'disponible' },
        { where: { id_disponibilidad: cita.id_disponibilidad }, transaction: t });
      await Disponibilidad.update({ estado: 'ocupado' },
        { where: { id_disponibilidad: cambios.id_disponibilidad }, transaction: t });
    }

    const payload = {};
    if (cambios.id_mascota !== undefined)        payload.id_mascota = cambios.id_mascota;
    if (cambios.id_disponibilidad !== undefined) payload.id_disponibilidad = cambios.id_disponibilidad;
    if (cambios.motivo !== undefined)            payload.motivo = cambios.motivo;
    if (Object.keys(payload).length) await cita.update(payload, { transaction: t });
  });

  return obtenerPorId(id_cita);
}

async function cancelar(id_cita, solicitante) {
  const cita = await Cita.findByPk(id_cita);
  if (!cita) throw AppError.notFound(`No existe cita con id ${id_cita}`);

  if (solicitante.rol === 'usuario') {
    const ok = await mascotaPerteneceAUsuario(cita.id_mascota, solicitante.id);
    if (!ok) throw AppError.forbidden('No tienes permiso para cancelar esta cita porque no te pertenece');
  }
  if (cita.estado === 'cancelado') throw AppError.conflict('La cita ya está cancelada');

  await sequelize.transaction(async (t) => {
    await cita.update({ estado: 'cancelado' }, { transaction: t });
    await Disponibilidad.update({ estado: 'disponible' },
      { where: { id_disponibilidad: cita.id_disponibilidad }, transaction: t });
  });

  return obtenerPorId(id_cita);
}

module.exports = { listar, obtenerPorId, listarPorEspecialista, crear, editar, cancelar };