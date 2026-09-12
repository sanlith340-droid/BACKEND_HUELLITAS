const {
  HistoriaClinica, Cita, Mascota, Disponibilidad, Usuario, sequelize,
} = require('../models');
const { Op } = require('sequelize');
const AppError = require('../utils/AppError');

const INCLUDE = [
  { model: Cita, as: 'Cita',
    include: [
      { model: Mascota, as: 'Mascota' },
      { model: Disponibilidad, as: 'Disponibilidad',
        include: [{ model: Usuario, as: 'Especialista',
          attributes: ['id_usuario','nombre','apellidos','especializacion'] }] },
    ] },
];

function transformar(h) {
  const p = h.toJSON();
  const c = p.Cita;
  const d = c?.Disponibilidad;
  const e = d?.Especialista;
  return {
    id_historia_clinica: p.id_historia_clinica,
    id_cita: p.id_cita,
    peso: p.peso,
    diagnostico: p.diagnostico,
    tratamiento: p.tratamiento,
    observaciones: p.observaciones,
    fecha_registro: p.fecha_registro,
    id_mascota: c?.id_mascota,
    mascota_nombre: c?.Mascota?.nombre,
    mascota_especie: c?.Mascota?.especie,
    mascota_genero: c?.Mascota?.genero,
    cita_motivo: c?.motivo,
    cita_estado: c?.estado,
    fecha_cita: d?.fecha,
    hora_cita: d?.hora,
    especialista_id: e?.id_usuario,
    especialista_nombre: e?.nombre,
    especialista_apellidos: e?.apellidos,
    especializacion: e?.especializacion,
  };
}

async function listar(filtros = {}) {
  const where = {};
  const citaWhere = {};
  const dispWhere = {};
  if (filtros.id_mascota)      citaWhere.id_mascota = filtros.id_mascota;
  if (filtros.id_especialista) dispWhere.id_usuario = filtros.id_especialista;
  if (filtros.fecha_inicio || filtros.fecha_fin) {
    where.fecha_registro = {};
    if (filtros.fecha_inicio) where.fecha_registro[Op.gte] = filtros.fecha_inicio;
    if (filtros.fecha_fin)    where.fecha_registro[Op.lte] = filtros.fecha_fin;
  }

  const include = [
    { model: Cita, as: 'Cita',
      ...(Object.keys(citaWhere).length ? { where: citaWhere } : {}),
      include: [
        { model: Mascota, as: 'Mascota' },
        { model: Disponibilidad, as: 'Disponibilidad',
          ...(Object.keys(dispWhere).length ? { where: dispWhere } : {}),
          include: [{ model: Usuario, as: 'Especialista',
            attributes: ['id_usuario','nombre','apellidos','especializacion'] }] },
      ] },
  ];

  const historias = await HistoriaClinica.findAll({
    where, include,
    order: [['fecha_registro', 'DESC']],
  });
  return historias.map(transformar);
}

async function obtenerPorId(id) {
  const h = await HistoriaClinica.findByPk(id, { include: INCLUDE });
  if (!h) throw AppError.notFound(`No existe historia clínica con id ${id}`);
  return transformar(h);
}

async function obtenerPorMascota(id_mascota) {
  const m = await Mascota.findByPk(id_mascota);
  if (!m) throw AppError.notFound(`No existe la mascota con id ${id_mascota}`);
  return listar({ id_mascota });
}

async function obtenerPorCita(id_cita) {
  const c = await Cita.findByPk(id_cita);
  if (!c) throw AppError.notFound(`No existe cita con id ${id_cita}`);
  const h = await HistoriaClinica.findOne({ where: { id_cita }, include: INCLUDE });
  if (!h) throw AppError.notFound(`No existe historia clínica para la cita ${id_cita}`);
  return transformar(h);
}

async function crear({ id_cita, peso, diagnostico, tratamiento, observaciones, especialistaId }) {
  const esp = await Usuario.findOne({ where: { id_usuario: especialistaId, rol: 'especialista' } });
  if (!esp) throw AppError.forbidden('Solo los especialistas pueden crear historias clínicas');

  const creada = await sequelize.transaction(async (t) => {
    // 1. Bloquear SOLO la cita (sin include, sin LEFT JOIN)
    const cita = await Cita.findByPk(id_cita, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!cita) throw AppError.notFound(`No existe cita con id ${id_cita}`);
    if (cita.estado === 'cancelado') {
      throw AppError.conflict('No se puede crear historia clínica para una cita cancelada');
    }

    // 2. Cargar la disponibilidad aparte (sin lock)
    const disp = await Disponibilidad.findByPk(cita.id_disponibilidad, { transaction: t });
    if (!disp || disp.id_usuario !== especialistaId) {
      throw AppError.forbidden('El especialista no está asignado a esta cita');
    }

    // 3. Verificar que no exista ya historia para la cita
    const existe = await HistoriaClinica.findOne({ where: { id_cita }, transaction: t });
    if (existe) throw AppError.conflict('La cita ya tiene una historia clínica asignada');

    // 4. Insertar (el trigger marca la cita como 'atendido')
    return HistoriaClinica.create({
      id_cita,
      peso: peso ?? null,
      diagnostico,
      tratamiento,
      observaciones: observaciones ?? null,
    }, { transaction: t });
  });

  return obtenerPorId(creada.id_historia_clinica);
}

async function actualizar(id, cambios, especialistaId) {
  const esp = await Usuario.findOne({ where: { id_usuario: especialistaId, rol: 'especialista' } });
  if (!esp) throw AppError.forbidden('Solo los especialistas pueden actualizar historias clínicas');

  const h = await HistoriaClinica.findByPk(id, { include: INCLUDE });
  if (!h) throw AppError.notFound(`No existe historia clínica con id ${id}`);

  const espAsignado = h.Cita?.Disponibilidad?.id_usuario;
  if (espAsignado !== especialistaId)
    throw AppError.forbidden('No tiene permisos para modificar esta historia clínica');

  const permitidos = ['peso','diagnostico','tratamiento','observaciones'];
  const update = {};
  for (const k of permitidos) if (cambios[k] !== undefined) update[k] = cambios[k];
  if (Object.keys(update).length === 0)
    throw AppError.badRequest('Debe proporcionar al menos un campo para actualizar');

  await h.update(update);
  return obtenerPorId(id);
}

module.exports = { listar, obtenerPorId, obtenerPorMascota, obtenerPorCita, crear, actualizar };