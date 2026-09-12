// app/routes/mascota.routes.js
const { Router } = require('express');
const controller = require('../controllers/mascota.controller');
const validate = require('../middlewares/validate');
const { requireRole } = require('../middlewares/identifyUser');
const { crearMascotaSchema } = require('../schemas/mascota.schema');

const router = Router();

router.get('/', controller.listar);
router.get('/:id', controller.obtener);

router.post(
  '/',
  requireRole('usuario', 'admin'),
  validate(crearMascotaSchema, 'body'),
  controller.crear
);

module.exports = router;