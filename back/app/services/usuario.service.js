const { Usuario } = require('../models');
const AppError = require('../utils/AppError');

async function obtenerPorDocumento(documento) {
  const usuario = await Usuario.findByPk(documento, {
    attributes: { exclude: ['contrasena'] },
  });
  if (!usuario) throw AppError.notFound(`No existe un usuario con ID ${documento}`);
  return usuario;
}

async function listarEspecialistas() {
  return Usuario.findAll({
    where: { rol: 'especialista' },
    attributes: ['id_usuario','nombre','apellidos','telefono','correo','especializacion','tipo','rol'],
    order: [['nombre', 'ASC']],
  });
}

module.exports = { obtenerPorDocumento, listarEspecialistas };