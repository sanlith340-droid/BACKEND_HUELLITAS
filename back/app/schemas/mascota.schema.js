// app/schemas/mascota.schema.js
const Joi = require('joi');

const ESPECIES_PERMITIDAS = ['perro', 'gato'];
const GENEROS_PERMITIDOS = ['macho', 'hembra'];

const crearMascotaSchema = Joi.object({
  nombre: Joi.string().max(200).required(),
  fecha_nacimiento: Joi.date().iso().required(),
  especie: Joi.string().valid(...ESPECIES_PERMITIDAS).required(),
  genero: Joi.string().valid(...GENEROS_PERMITIDOS).required(),
  id_raza: Joi.number().integer().positive().required()
});

module.exports = {
  crearMascotaSchema,
  ESPECIES_PERMITIDAS,
  GENEROS_PERMITIDOS
};