// app/config/database.js
require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'proyectohs',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development'
      ? (msg) => console.log('[sql]', msg)
      : false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: false, freezeTableName: true, underscored: false },
  }
);

async function query(text, params = []) {
  const isSelect = /^\s*SELECT/i.test(text);
  if (isSelect) {
    const rows = await sequelize.query(text, {
      replacements: params,
      type: QueryTypes.SELECT,
    });
    return { rows, rowCount: rows.length };
  }
  const [results, metadata] = await sequelize.query(text, {
    replacements: params,
  });
  return {
    rows: Array.isArray(results) ? results : [],
    rowCount: metadata?.rowCount ?? 0,
  };
}

async function testConnection() {
  await sequelize.authenticate();
  const rows = await sequelize.query('SELECT NOW() AS now', {
    type: QueryTypes.SELECT,
  });
  return rows[0].now;
}

module.exports = {
  sequelize,
  Sequelize,
  query,
  testConnection,
  getClient: () => sequelize,
};