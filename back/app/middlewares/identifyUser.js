// app/middlewares/identifyUser.js
const { Usuario } = require('../models');

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/registro',
  '/health',
];

function isPublicRoute(req) {
  const path = req.originalUrl.split('?')[0];
  return PUBLIC_ROUTES.includes(path);
}

const identifyUser = async (req, res, next) => {
  if (isPublicRoute(req)) return next();

  try {
    const userId   = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: 'Faltan los headers x-user-id y x-user-role',
        code: 'UNAUTHORIZED',
      });
    }

    const usuario = await Usuario.findByPk(String(userId).trim(), {
      attributes: ['id_usuario', 'rol'],
    });

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'El usuario no existe',
        code: 'UNAUTHORIZED',
        details: { id_usuario: userId },
      });
    }

    const rolReal    = String(usuario.rol).trim().toLowerCase();
    const rolEnviado = String(userRole).trim().toLowerCase();

    if (rolReal !== rolEnviado) {
      return res.status(403).json({
        success: false,
        message: 'El rol enviado no corresponde al usuario',
        code: 'FORBIDDEN',
        details: { id_usuario: usuario.id_usuario, rol_enviado: userRole, rol_real: usuario.rol },
      });
    }

    req.user = { id: usuario.id_usuario, rol: rolReal };
    next();
  } catch (error) {
    console.error('[identifyUser] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al validar el usuario',
      code: 'INTERNAL_SERVER_ERROR',
      details: error.message,
    });
  }
};

const requireRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (isPublicRoute(req)) return next();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
        code: 'UNAUTHORIZED',
      });
    }

    const rolUsuario = String(req.user.rol).trim().toLowerCase();
    const roles = rolesPermitidos.map(r => String(r).trim().toLowerCase());

    if (!roles.includes(rolUsuario)) {
      return res.status(403).json({
        success: false,
        message: 'No tiene permisos para realizar esta acción',
        code: 'FORBIDDEN',
        details: { rol_actual: req.user.rol, roles_permitidos: rolesPermitidos },
      });
    }
    next();
  };
};

module.exports = { identifyUser, requireRole };