# Documentacion completa - Huellitas Saludables Backend

Esta guia cubre dos temas principales:

1. **Configuracion del entorno** (psql en el PATH) para poder ejecutar los comandos del proyecto
2. **El ORM Sequelize** y como usarlo en este proyecto

---

# PARTE 1 - Configurar psql en el PATH

## 1.1. Por que configurarlo

Hoy, cada vez que quieres usar `psql` tienes que escribir la ruta completa:

```bash
PGPASSWORD=tu_password "/c/Formacion/pgsql-18-3-2/pgsql/bin/psql.exe" -U postgres -h localhost -d proyectohs -c "SELECT NOW();"
```

Es incomodo. La idea es poder escribir solo:

```bash
PGPASSWORD=tu_password psql -U postgres -h localhost -d proyectohs -c "SELECT NOW();"
```

## 1.2. Encontrar la ruta de PostgreSQL

Confirma donde esta instalado. En este proyecto es:

```
C:\Formacion\pgsql-18-3-2\pgsql\bin
```

Si no estas seguro:

```bash
find /c -name "psql.exe" 2>/dev/null | head -5
```

## 1.3. Agregar al PATH de Git Bash

### Opcion A - Temporal (solo la sesion actual)

```bash
export PATH="/c/Formacion/pgsql-18-3-2/pgsql/bin:$PATH"
```

Verifica:

```bash
which psql
```

Debe mostrar:

```
/c/Formacion/pgsql-18-3-2/pgsql/bin/psql
```

### Opcion B - Permanente (recomendado)

Edita `~/.bashrc`:

```bash
code ~/.bashrc
```

Agrega al final:

```bash
# PostgreSQL bin
export PATH="/c/Formacion/pgsql-18-3-2/pgsql/bin:$PATH"
```

Recarga la configuracion:

```bash
source ~/.bashrc
```

Verifica:

```bash
which psql
psql --version
```

Debe mostrar algo como:

```
/c/Formacion/pgsql-18-3-2/pgsql/bin/psql
psql (PostgreSQL) 18.3
```

Si no funciona, cierra Git Bash y vuelve a abrirlo.

## 1.4. Evitar escribir el password cada vez

### Opcion A - Variable temporal

```bash
export PGPASSWORD='tu_password'
```

Despues ya no pide password:

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT NOW();"
```

### Opcion B - Archivo .pgpass (mas seguro)

Crea `~/.pgpass`:

```bash
code ~/.pgpass
```

Contenido:

```
localhost:5432:proyectohs:postgres:tu_password
```

Formato: `host:puerto:base_de_datos:usuario:password`.

Cambia los permisos:

```bash
chmod 600 ~/.pgpass
```

Ahora puedes conectarte sin escribir el password.

### Opcion C - Alias (solo desarrollo)

Edita `~/.bashrc`:

```bash
alias pshs='PGPASSWORD=tu_password psql -U postgres -h localhost -d proyectohs'
```

Recarga:

```bash
source ~/.bashrc
```

Uso:

```bash
pshs -c "SELECT * FROM usuario LIMIT 5;"
```

Advertencia: el password queda en texto plano en `~/.bashrc`.

## 1.5. Comandos de referencia una vez configurado

### Verificar conexion

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT NOW();"
```

### Listar tablas

```bash
psql -U postgres -h localhost -d proyectohs -c "\dt"
```

### Ver estructura de una tabla

```bash
psql -U postgres -h localhost -d proyectohs -c "\d usuario"
```

### Ver triggers

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;"
```

### Ver contenido

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT * FROM usuario LIMIT 5;"
```

### Contar registros

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT COUNT(*) FROM usuario;"
```

### Sesion interactiva

```bash
psql -U postgres -h localhost -d proyectohs
```

Dentro:

```
proyectohs=# SELECT * FROM usuario;
proyectohs=# \dt
proyectohs=# \d usuario
proyectohs=# \q
```

## 1.6. Probar la API con curl

Una vez configurado `psql`, tambien puedes probar los endpoints con `curl`.

### Healthcheck

```bash
curl http://localhost:3000/health
```

Respuesta:

```json
{"success":true,"message":"Servicio y base de datos activos","data":{"db_time":"2026-..."}}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"pedro.gonzalez@gmail.com","contrasena":"123456"}'
```

### Listar mascotas

```bash
curl http://localhost:3000/api/mascotas \
  -H "x-user-id: USU001" -H "x-user-role: usuario"
```

### Listar disponibilidad

```bash
curl "http://localhost:3000/api/disponibilidad?id_usuario=ESP001&estado=disponible" \
  -H "x-user-id: USU001" -H "x-user-role: usuario"
```

### Crear cita

```bash
curl -X POST http://localhost:3000/api/citas \
  -H "Content-Type: application/json" \
  -H "x-user-id: USU001" -H "x-user-role: usuario" \
  -d '{"id_mascota":1,"id_disponibilidad":1,"motivo":"Consulta general"}'
```

### Crear historia clinica

```bash
curl -X POST http://localhost:3000/api/historia \
  -H "Content-Type: application/json" \
  -H "x-user-id: ESP001" -H "x-user-role: especialista" \
  -d '{"id_cita":1,"peso":18.5,"diagnostico":"Otitis","tratamiento":"Gotas","observaciones":"Control"}'
```

### Notas sobre curl en Windows

- Los headers con `x-user-id` y `x-user-role` son la autenticacion provisional.
- Si el JSON tiene acentos, guardalo en un archivo y usa `--data-binary @archivo.json`:

```bash
cat > /tmp/body.json << 'EOF'
{"id_cita":1,"diagnostico":"Otitis externa","tratamiento":"Gotas óticas"}
EOF

curl -X POST http://localhost:3000/api/historia \
  -H "Content-Type: application/json; charset=utf-8" \
  -H "x-user-id: ESP001" -H "x-user-role: especialista" \
  --data-binary @/tmp/body.json
```

- Para verificar los datos en la BD despues de un curl:

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT id_cita, estado FROM cita;"
```

---

# PARTE 2 - El ORM Sequelize en el proyecto

## 2.1. Que es un ORM

Un ORM (Object-Relational Mapping) traduce entre JavaScript y la base de datos.

**Antes (SQL puro):**

```javascript
const resultado = await query('SELECT * FROM usuario WHERE correo = $1', [correo]);
const usuario = resultado.rows[0];
```

**Ahora (con Sequelize):**

```javascript
const usuario = await Usuario.findOne({ where: { correo } });
```

Ventajas:

- Menos errores de tipeo en SQL
- Codigo mas facil de leer
- Las relaciones entre tablas se manejan solas
- Las migraciones quedan versionadas
- Los datos se validan antes de ir a la BD

## 2.2. Estructura de archivos

```
back/
├── .env                          <- contrasenas (NO subir a git)
├── .env.example                  <- plantilla
├── .sequelizerc                  <- config del CLI de Sequelize
├── package.json                  <- scripts y dependencias
├── server.js                     <- arranca el servidor
│
├── migrations/                   <- archivos que crean/modifican tablas
│   ├── 20260101000001-create-schema.js
│   └── 20260101000002-create-triggers.js
│
├── seeders/                      <- datos de prueba
│   └── 20260101000000-demo-data.js
│
└── app/
    ├── config/
    │   ├── database.js           <- conexion Sequelize (runtime)
    │   ├── sequelize-cli.js      <- config para migraciones (CLI)
    │   └── swagger.js
    ├── models/                   <- definicion de cada tabla
    │   ├── index.js              <- carga modelos y relaciones
    │   ├── usuario.model.js
    │   ├── raza.model.js
    │   ├── mascota.model.js
    │   ├── disponibilidad.model.js
    │   ├── cita.model.js
    │   └── historia.model.js
    ├── services/                 <- logica de negocio
    ├── controllers/              <- reciben peticiones HTTP
    ├── routes/                   <- definen las URLs
    ├── middlewares/
    ├── schemas/
    └── utils/
```

## 2.3. Variables de entorno (.env)

Archivo `back/.env`:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=proyectohs
DB_USER=postgres
DB_PASSWORD=H4ll1t4s_V3t_2026_S3cur3_M3d_B4ckend

CORS_ORIGIN=*
```

Reglas para el password:

- Minimo 20 caracteres
- Mayusculas, minusculas, numeros, guiones bajos
- Evitar `$`, `!`, `#`, `&`, comillas
- Sin simbolos que rompan bash o el `.env`

## 2.4. Configuracion de Sequelize

### 2.4.1. Runtime - app/config/database.js

Lo usa Express en tiempo de ejecucion:

```javascript
require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

module.exports = { sequelize, Sequelize, testConnection, query };
```

### 2.4.2. CLI - app/config/sequelize-cli.js

Lo usa sequelize-cli para las migraciones:

```javascript
require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'proyectohs',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base },
};
```

### 2.4.3. .sequelizerc

Le dice al CLI donde buscar cada cosa:

```javascript
const path = require('path');

module.exports = {
  'config': path.resolve('app', 'config', 'sequelize-cli.js'),
  'models-path': path.resolve('app', 'models'),
  'seeders-path': path.resolve('seeders'),
  'migrations-path': path.resolve('migrations'),
};
```

## 2.5. Los modelos

Un modelo es la representacion en JavaScript de una tabla.

```javascript
// app/models/usuario.model.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id_usuario: { type: DataTypes.STRING(10), primaryKey: true },
  nombre:     { type: DataTypes.STRING(100), allowNull: false },
  correo:     { type: DataTypes.STRING(150), allowNull: false, unique: true },
  rol:        { type: DataTypes.STRING(20),  defaultValue: 'usuario' },
}, {
  tableName: 'usuario',
  timestamps: false,
});

module.exports = Usuario;
```

El modelo describe la tabla pero NO la crea. Para crearla se usan migraciones.

## 2.6. Migraciones en profundidad

Una migracion es un archivo que describe un cambio en la BD (crear tabla, agregar columna, crear indice, etc.). Sirven para:

- Mantener la estructura sincronizada entre todos los desarrolladores
- Poder deshacer cambios
- Tener un historial versionado
- Evitar crear tablas a mano

### 2.6.1. Donde viven

En `back/migrations/`.

### 2.6.2. Estructura de una migracion

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE prueba (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE prueba;
    `);
  },
};
```

- `up`: aplica el cambio
- `down`: deshace el cambio

### 2.6.3. Nombre de una migracion

Formato: `YYYYMMDDHHMMSS-descripcion.js`

Ejemplo:

```
20260101000001-create-schema.js
```

El timestamp define el orden de ejecucion.

### 2.6.4. Comandos para migraciones

**Ver estado:**

```bash
npx sequelize-cli db:migrate:status
```

Salida:

```
Up     20260101000001-create-schema.js
Up     20260101000002-create-triggers.js
```

- `Up`: aplicada
- `Down` (o vacio): pendiente

**Ejecutar pendientes:**

```bash
npx sequelize-cli db:migrate
```

O con el script:

```bash
npm run migrate
```

Salida esperada:

```
== 20260101000001-create-schema: migrating =======
== 20260101000001-create-schema: migrated (0.054s)

== 20260101000002-create-triggers: migrating =======
== 20260101000002-create-triggers: migrated (0.010s)
```

**Deshacer la ultima:**

```bash
npx sequelize-cli db:migrate:undo
```

O:

```bash
npm run migrate:undo
```

Ejecuta el `down` de la ultima migracion aplicada.

**Deshacer todas:**

```bash
npx sequelize-cli db:migrate:undo:all
```

O:

```bash
npm run migrate:undo:all
```

**Deshacer hasta una especifica:**

```bash
npx sequelize-cli db:migrate:undo:all --to 20260101000001-create-schema.js
```

### 2.6.5. Donde se guarda el registro

En una tabla llamada `SequelizeMeta`. Ahi estan las migraciones aplicadas.

```sql
SELECT * FROM "SequelizeMeta";
```

No borres esa tabla. Si la borras, el CLI va a intentar aplicar todo de nuevo.

### 2.6.6. Crear una migracion nueva

```bash
npx sequelize-cli migration:generate --name agregar-telefono-usuario
```

Crea:

```
migrations/20260101120000-agregar-telefono-usuario.js
```

Con plantilla:

```javascript
'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    // logica para aplicar
  },

  async down (queryInterface, Sequelize) {
    // logica para deshacer
  }
};
```

### 2.6.7. Metodos de queryInterface

**Metodo 1: createTable (estructurado)**

```javascript
async up(queryInterface, Sequelize) {
  await queryInterface.createTable('prueba', {
    id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: Sequelize.STRING(100), allowNull: false },
    fecha_registro: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
  });
}
```

**Metodo 2: addColumn**

```javascript
async up(queryInterface, Sequelize) {
  await queryInterface.addColumn('usuario', 'telefono_fijo', {
    type: Sequelize.STRING(20),
    allowNull: true,
  });
}

async down(queryInterface) {
  await queryInterface.removeColumn('usuario', 'telefono_fijo');
}
```

**Metodo 3: SQL crudo**

Cuando necesitas algo especifico de PostgreSQL (triggers, plpgsql, CHECK complejos):

```javascript
async up(queryInterface) {
  await queryInterface.sequelize.query(`
    CREATE OR REPLACE FUNCTION mi_funcion()
    RETURNS TRIGGER AS $$
    BEGIN
      -- logica
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}
```

### 2.6.8. Migraciones del proyecto

**20260101000001-create-schema.js**

Crea las 7 tablas:

- usuario
- raza
- mascota
- usuario_mascota
- disponibilidad
- cita
- historia_clinica

Con todos sus CHECK, FOREIGN KEY y UNIQUE.

**20260101000002-create-triggers.js**

Crea 2 funciones plpgsql y sus 2 triggers:

- `trg_actualizar_disponibilidad_cita` (AFTER INSERT ON cita)
- `trg_historia_cita_atendida` (AFTER INSERT ON historia_clinica)

### 2.6.9. Reglas para escribir migraciones

1. El `down` siempre debe deshacer lo que hizo `up`.
2. Nombres descriptivos: `agregar-campo-telefono`, no `cambio1`.
3. Cada migracion hace una cosa.
4. No edites migraciones ya aplicadas. Crea una nueva.
5. Las migraciones no llevan datos de prueba (eso es para seeders).

## 2.7. Seeders en profundidad

Un seeder inserta datos de prueba o iniciales en la BD.

### 2.7.1. Donde viven

En `back/seeders/`.

### 2.7.2. Estructura

```javascript
'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('usuario', [
      { id_usuario: 'USU001', nombre: 'Pedro', correo: 'pedro@email.com', rol: 'usuario' },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('usuario', null, {});
  },
};
```

### 2.7.3. Comandos para seeders

**Ejecutar todos:**

```bash
npx sequelize-cli db:seed:all
```

O:

```bash
npm run seed
```

**Deshacer el ultimo:**

```bash
npx sequelize-cli db:seed:undo
```

**Deshacer todos:**

```bash
npx sequelize-cli db:seed:undo:all
```

O:

```bash
npm run seed:undo
```

**Ejecutar uno especifico:**

```bash
npx sequelize-cli db:seed --seed 20260101000000-demo-data.js
```

**Deshacer uno especifico:**

```bash
npx sequelize-cli db:seed:undo --seed 20260101000000-demo-data.js
```

**Ver estado:**

```bash
npx sequelize-cli db:seed:status
```

### 2.7.4. Donde se guarda el registro

Igual que las migraciones: en `SequelizeMeta`. Si un seeder se ejecuto, no se vuelve a ejecutar.

### 2.7.5. Crear un seeder nuevo

```bash
npx sequelize-cli seed:generate --name usuarios-demo
```

Crea `seeders/20260101120000-usuarios-demo.js`.

### 2.7.6. Metodos utiles

**bulkInsert:**

```javascript
await queryInterface.bulkInsert('usuario', [
  { id_usuario: 'USU001', nombre: 'Pedro', rol: 'usuario' },
  { id_usuario: 'USU002', nombre: 'Maria', rol: 'usuario' },
]);
```

**bulkDelete:**

```javascript
// Borrar todos
await queryInterface.bulkDelete('usuario', null, {});

// Borrar con condicion
await queryInterface.bulkDelete('usuario', { rol: 'usuario' }, {});
```

**SQL crudo (para subconsultas):**

```javascript
await queryInterface.sequelize.query(`
  INSERT INTO mascota (nombre, fecha_nacimiento, especie, id_raza)
  VALUES
    ('Max', '2021-03-15', 'perro', (SELECT id_raza FROM raza WHERE nombre='Labrador')),
    ('Luna', '2022-07-10', 'gato', (SELECT id_raza FROM raza WHERE nombre='Persa'));
`);
```

### 2.7.7. Seeder del proyecto

`seeders/20260101000000-demo-data.js` inserta:

| Tabla | Cantidad |
|---|---|
| usuario | 17 |
| raza | 14 |
| mascota | 10 |
| usuario_mascota | 16 |
| disponibilidad | 90 |

Orden de insercion (importante por las foreign keys):

1. `usuario`
2. `raza`
3. `mascota` (depende de raza)
4. `usuario_mascota` (depende de usuario y mascota)
5. `disponibilidad` (depende de usuario)

### 2.7.8. Reglas para escribir seeders

1. Respeta el orden de las foreign keys.
2. El `down` debe borrar todo lo que insertaste.
3. Usa SQL crudo para subconsultas complejas.
4. Los seeders son para datos de prueba, no produccion.
5. Si crece mucho, dividelo en varios archivos.

### 2.7.9. Diferencia entre migracion y seeder

| | Migracion | Seeder |
|---|---|---|
| Que hace | Cambia estructura | Inserta datos |
| Ejemplo | Crear tabla usuario | Insertar 17 usuarios |
| Cuando se corre | Al montar el proyecto | Despues de las migraciones |
| En produccion | Si | No |
| Comando | `npm run migrate` | `npm run seed` |

## 2.8. Triggers de la base de datos

### 2.8.1. Trigger 1 - disponibilidad ocupada

- Cuando: se crea una cita
- Que hace: marca la disponibilidad como `ocupado`
- Funcion: `actualizar_disponibilidad_cita()`
- Nombre: `trg_actualizar_disponibilidad_cita`

### 2.8.2. Trigger 2 - cita atendida

- Cuando: se crea una historia clinica
- Que hace: marca la cita como `atendido`
- Funcion: `actualizar_cita_atendida()`
- Nombre: `trg_historia_cita_atendida`

### 2.8.3. Regla importante

Los servicios NO deben hacer esto manualmente. El trigger ya lo hace. Si lo hicieramos en ambos lados, se duplicaria.

### 2.8.4. Verificar que existen

```bash
psql -U postgres -h localhost -d proyectohs -c "SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;"
```

Debe mostrar los 2 triggers.

## 2.9. Servicios (logica de negocio)

Los servicios contienen la logica de la aplicacion.

Ejemplo:

```javascript
async function listar() {
  const mascotas = await Mascota.findAll({
    include: [
      { model: Raza, as: 'Raza' },
      { model: Usuario, as: 'Propietarios' },
    ],
    order: [['id_mascota', 'ASC']],
  });
  return mascotas;
}
```

### 2.9.1. Servicios del proyecto

| Servicio | Funciones |
|---|---|
| auth.service.js | login, registro, registroAdmin |
| usuario.service.js | obtenerPorDocumento, listarEspecialistas |
| mascota.service.js | listar, obtenerPorId, crearConUsuario |
| disponibilidad.service.js | listar, crear, actualizar, eliminar |
| cita.service.js | listar, crear, editar, cancelar |
| historia.service.js | listar, crear, actualizar |

## 2.10. Consultas comunes con Sequelize

**Buscar por ID:**

```javascript
const usuario = await Usuario.findByPk('USU001');
```

**Buscar por otro campo:**

```javascript
const usuario = await Usuario.findOne({ where: { correo: 'pedro@email.com' } });
```

**Traer todos:**

```javascript
const usuarios = await Usuario.findAll();
```

**Traer con filtro:**

```javascript
const citas = await Cita.findAll({ where: { estado: 'pendiente' } });
```

**Crear:**

```javascript
const nuevo = await Usuario.create({
  id_usuario: 'USU011',
  nombre: 'Ana',
  correo: 'ana@email.com',
  rol: 'usuario',
});
```

**Actualizar:**

```javascript
await usuario.update({ telefono: '3001112233' });
```

**Borrar:**

```javascript
await usuario.destroy();
```

**Traer relaciones:**

```javascript
const cita = await Cita.findByPk(1, {
  include: [
    { model: Mascota, as: 'Mascota' },
    { model: Disponibilidad, as: 'Disponibilidad' },
  ],
});
```

**Contar:**

```javascript
const total = await Usuario.count();
```

**Condiciones complejas:**

```javascript
const { Op } = require('sequelize');

const usuarios = await Usuario.findAll({
  where: {
    rol: { [Op.in]: ['admin', 'especialista'] },
    correo: { [Op.like]: '%@gmail.com' },
  },
});
```

## 2.11. Transacciones

Una transaccion es un grupo de operaciones que se ejecutan todas o ninguna.

```javascript
const creada = await sequelize.transaction(async (t) => {
  const m = await Mascota.create({
    nombre: 'Firulais',
    fecha_nacimiento: '2023-05-15',
    especie: 'perro',
    genero: 'macho',
    id_raza: 1,
  }, { transaction: t });

  await UsuarioMascota.create({
    id_usuario: 'USU001',
    id_mascota: m.id_mascota,
  }, { transaction: t });

  return m;
});
```

### 2.11.1. Regla sobre locks

Cuando necesitas bloquear una fila y ademas traer relaciones, no lo hagas en la misma consulta:

```javascript
// MAL - falla en PostgreSQL
const cita = await Cita.findByPk(id, {
  include: [{ model: Disponibilidad, as: 'Disponibilidad' }],
  lock: t.LOCK.UPDATE,
});

// BIEN - dos consultas separadas
const cita = await Cita.findByPk(id, { lock: t.LOCK.UPDATE, transaction: t });
const disp = await Disponibilidad.findByPk(cita.id_disponibilidad, { transaction: t });
```

PostgreSQL no permite `FOR UPDATE` en el lado nullable de un `LEFT JOIN`.

## 2.12. Scripts de npm

| Comando | Que hace |
|---|---|
| `npm run dev` | Servidor con reinicio automatico |
| `npm start` | Servidor en produccion |
| `npm run migrate` | Ejecutar migraciones pendientes |
| `npm run migrate:undo` | Deshacer la ultima |
| `npm run migrate:undo:all` | Deshacer todas |
| `npm run seed` | Cargar datos de prueba |
| `npm run seed:undo` | Borrar datos de prueba |
| `npm run db:reset` | undo:all + migrate + seed |

## 2.13. Como arrancar el proyecto desde cero

```bash
# 1. Instalar dependencias
npm install

# 2. Crear .env
cp .env.example .env
code .env

# 3. Verificar PostgreSQL
tasklist | grep postgres

# 4. Crear la base de datos (si no existe)
psql -U postgres -c "CREATE DATABASE proyectohs WITH OWNER=postgres ENCODING='UTF8';"

# 5. Ejecutar migraciones
npm run migrate

# 6. Cargar datos de prueba
npm run seed

# 7. Arrancar el servidor
npm run dev
```

Debe mostrar:

```
[server] Huellitas Saludables API
[server] Servidor ejecutándose en http://localhost:3000
[server] Healthcheck: http://localhost:3000/health
[server] API Docs: http://localhost:3000/api-docs
```

## 2.14. Flujos de trabajo tipicos

### 2.14.1. Reset completo

```bash
npm run db:reset
```

Hace:

1. `db:migrate:undo:all` - borra todas las tablas
2. `db:migrate` - crea de nuevo
3. `db:seed:all` - inserta datos

### 2.14.2. Agregar un campo a una tabla

**Paso 1:** Crear migracion.

```bash
npx sequelize-cli migration:generate --name agregar-campo-telefono-usuario
```

**Paso 2:** Editar.

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuario', 'telefono_fijo', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('usuario', 'telefono_fijo');
  },
};
```

**Paso 3:** Actualizar el modelo.

```javascript
telefono_fijo: { type: DataTypes.STRING(20), allowNull: true },
```

**Paso 4:** Ejecutar.

```bash
npm run migrate
```

### 2.14.3. Agregar una nueva tabla

**Paso 1:** Migracion.

```bash
npx sequelize-cli migration:generate --name crear-tabla-vacuna
```

**Paso 2:** Editar con SQL crudo.

```javascript
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE vacuna (
        id_vacuna INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        fecha_aplicacion DATE NOT NULL,
        id_mascota INTEGER NOT NULL,
        CONSTRAINT fk_vacuna_mascota FOREIGN KEY (id_mascota)
          REFERENCES mascota(id_mascota) ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP TABLE vacuna;`);
  },
};
```

**Paso 3:** Crear el modelo.

**Paso 4:** Agregar relaciones en `models/index.js`.

**Paso 5:** Ejecutar.

```bash
npm run migrate
```

### 2.14.4. Ver el SQL que Sequelize genera

Activa el logging en `database.js`:

```javascript
logging: (msg) => console.log('[sql]', msg),
```

Cada consulta se imprime en consola. Util para depurar.

## 2.15. Errores comunes

### "No migrations were found"

Causa: no hay archivos en `migrations/` o el `.sequelizerc` esta mal.

Solucion:

```bash
ls migrations/
cat .sequelizerc
```

### "ERROR: relation 'usuario' already exists"

Causa: la tabla existe pero `SequelizeMeta` no tiene el registro.

Solucion:

```bash
psql -U postgres -h localhost -d proyectohs -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run migrate
npm run seed
```

### "Cannot find module 'app/config/sequelize-cli.js'"

Causa: el archivo no existe o `.sequelizerc` apunta a otra ruta.

### "password authentication failed"

Causa: el password en `.env` no coincide.

### "ECONNREFUSED"

Causa: PostgreSQL no esta corriendo o el host es incorrecto.

### Seeder falla con "foreign key violation"

Causa: intentas insertar una fila que referencia a una tabla vacia.

Solucion: respetar el orden (usuario, raza, mascota, usuario_mascota, disponibilidad).

### "FOR UPDATE cannot be applied to the nullable side of an outer join"

Causa: `lock` y `include` en la misma consulta.

Solucion: separar en dos consultas.

### "Migration X.js was already executed"

Causa: Sequelize ya tiene registrada esa migracion pero el archivo cambio.

Solucion: no edites migraciones ya ejecutadas. Crea una nueva.

### Los acentos se ven mal en la terminal

Causa: Git Bash no interpreta UTF-8.

Solucion: los datos en la BD estan bien. Para verlos usa Node:

```bash
node -e "
require('dotenv').config();
const { sequelize } = require('./app/models');
sequelize.query('SELECT diagnostico FROM historia_clinica', { type: sequelize.QueryTypes.SELECT })
  .then(console.log);
"
```

O usa DBeaver, pgAdmin o VS Code Database Client.

### "event not found" al escribir `!`

Causa: bash interpreta `!` como historial.

Solucion: `set +H` o escapar con `\!`.

## 2.16. Reglas importantes

1. Nunca subir `.env` a git.
2. No repetir la logica de los triggers en los servicios.
3. Usar siempre los modelos, no SQL puro en los servicios.
4. Usar transacciones para operaciones compuestas.
5. Pasar `{ transaction: t }` a cada operacion dentro de una transaccion.
6. Los nombres de las relaciones (alias `as`) deben coincidir entre `index.js` e `include`.
7. Los passwords no llevan simbolos raros (`$`, `!`, `#`, `&`, comillas).
8. No edites migraciones ya aplicadas. Crea una nueva.
9. Los seeders son para datos de prueba, no produccion.
10. Respeta el orden de las foreign keys al insertar datos.

## 2.17. Pendientes para produccion

1. Hash de contrasenas con bcrypt (ahora estan en texto plano).
2. Autenticacion con JWT en lugar de headers `x-user-id` / `x-user-role`.
3. Tests automatizados con Jest + Supertest.
4. Limpiar dependencias de frontend del `package.json` del backend.
5. Endurecer `pg_hba.conf` a `scram-sha-256` en produccion.
6. Mover la documentacion de Swagger a archivos separados.

## 2.18. Glosario

| Termino | Significado |
|---|---|
| ORM | Object-Relational Mapping |
| Modelo | Representacion en JavaScript de una tabla |
| Migracion | Archivo que describe cambios en la estructura de la BD |
| Seeder | Archivo que inserta datos de prueba |
| Trigger | Funcion que la BD ejecuta sola |
| Transaccion | Grupo de operaciones que se ejecutan todas o ninguna |
| `SequelizeMeta` | Tabla donde se guarda el historial de migraciones y seeders |
| `queryInterface` | Objeto con metodos para manipular la BD |
| `bulkInsert` | Metodo para insertar varios registros |
| `bulkDelete` | Metodo para borrar registros con condicion |
| `addColumn` | Metodo para agregar una columna |
| `removeColumn` | Metodo para quitar una columna |
| `createTable` | Metodo para crear una tabla |
| `dropTable` | Metodo para borrar una tabla |
| `changeColumn` | Metodo para cambiar tipo o restricciones de una columna |
| `renameColumn` | Metodo para renombrar una columna |

## 2.19. Recursos

- Documentacion Sequelize: https://sequelize.org/docs/v6/
- Documentacion sequelize-cli: https://github.com/sequelize/cli
- Documentacion PostgreSQL: https://www.postgresql.org/docs/current/
- Documentacion del proyecto: `Documentacion_Backend_Huellitas_Saludables.md`
- Documentacion tecnica del ORM: `01_Implemetar_ORM.md`

## 2.20. Notas finales

- Las migraciones son historial inmutable. No las edites despues de aplicarlas.
- Los seeders son datos de prueba. No los uses para produccion.
- Si algo se rompe, `npm run db:reset` resuelve el 90% de los casos.
- Cuando dudes, activa el logging de Sequelize para ver el SQL generado.