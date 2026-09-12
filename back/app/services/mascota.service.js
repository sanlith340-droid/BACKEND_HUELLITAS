const { Usuario, Mascota, Raza, UsuarioMascota, sequelize } = require('../models');
const AppError = require('../utils/AppError');

function transformarMascota(m) {
  const plain = m.toJSON();
  const propietarios = (plain.Propietarios || []).map(u => ({
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellidos: u.apellidos,
    telefono: u.telefono,
    correo: u.correo,
    tipo: u.tipo,
  }));
  return {
    id_mascota: plain.id_mascota,
    mascota: plain.nombre,
    fecha_nacimiento: plain.fecha_nacimiento,
    especie: plain.especie,
    genero: plain.genero,
    raza: plain.Raza ? { id_raza: plain.Raza.id_raza, nombre: plain.Raza.nombre } : null,
    propietarios,
  };
}

async function listar() {
  const mascotas = await Mascota.findAll({
    include: [
      { model: Raza, as: 'Raza' },
      { model: Usuario, as: 'Propietarios', through: { attributes: [] } },
    ],
    order: [['id_mascota', 'ASC']],
  });
  return mascotas.map(transformarMascota);
}

async function obtenerPorId(id) {
  const mascota = await Mascota.findByPk(id, {
    include: [
      { model: Raza, as: 'Raza' },
      { model: Usuario, as: 'Propietarios', through: { attributes: [] } },
    ],
  });
  if (!mascota) throw AppError.notFound(`No existe la mascota con id ${id}`);
  return transformarMascota(mascota);
}

async function perteneceAUsuario(id_mascota, id_usuario) {
  const link = await UsuarioMascota.findOne({ where: { id_mascota, id_usuario } });
  return Boolean(link);
}

async function crearConUsuario(datos, id_usuario) {
  const raza = await Raza.findByPk(datos.id_raza);
  if (!raza) throw AppError.notFound(`No existe la raza con id ${datos.id_raza}`);
  if (!['perro','gato'].includes(datos.especie))
    throw AppError.badRequest('La especie debe ser: perro, gato');
  if (!['macho','hembra'].includes(datos.genero))
    throw AppError.badRequest('El género debe ser: macho, hembra');

  const creada = await sequelize.transaction(async (t) => {
    const m = await Mascota.create({
      nombre: datos.nombre,
      fecha_nacimiento: datos.fecha_nacimiento,
      especie: datos.especie,
      genero: datos.genero,
      id_raza: datos.id_raza,
    }, { transaction: t });

    await UsuarioMascota.create(
      { id_usuario, id_mascota: m.id_mascota },
      { transaction: t }
    );
    return m;
  });

  return obtenerPorId(creada.id_mascota);
}

module.exports = { listar, obtenerPorId, perteneceAUsuario, crearConUsuario };