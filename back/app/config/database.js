// app/config/database.js
/**
 * config/database.js
 * Instancia real de Sequelize usada por la aplicación (Express).
 *
 * Antes este archivo exponía un Pool de "pg" con SQL puro.
 * Ahora expone la instancia de Sequelize (ORM), y mantiene
 * `query` y `testConnection` con la misma forma que antes
 * (testConnection() y query() => { rows }) para no romper el
 * código que ya dependía de esas funciones (healthcheck, middlewares).
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'proyectohs',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV !== 'production' ? console.log : false,
    define: {
      // Los nombres de tabla ya vienen definidos manualmente (tableName)
      // por cada modelo, así que no queremos pluralización automática.
      freezeTableName: true,
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

/**
 * Prueba la conexión a la base de datos.
 * Se usa en el healthcheck (GET /health).
 */
async function testConnection() {
  await sequelize.authenticate();
  const [result] = await sequelize.query('SELECT NOW() AS now');
  return result[0].now;
}

/**
 * Compatibilidad con el código legado que usaba `query(sql, params)`
 * y esperaba `{ rows }` (estilo "pg"). Internamente ahora usa Sequelize.
 * Se mantiene únicamente para no tener que tocar utilidades externas
 * a los modelos que aún pudieran usarlo.
 */
async function query(sql, params = []) {
  const rows = await sequelize.query(sql, {
    bind: params,
    type: sequelize.QueryTypes.SELECT,
  });
  return { rows };
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection,
  query,
};
