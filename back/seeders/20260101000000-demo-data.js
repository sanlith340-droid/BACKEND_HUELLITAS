'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('usuario', [
      { id_usuario:'REC001', nombre:'Laura',    apellidos:'Gomez Rodriguez',  telefono:'3001112233', correo:'laura.gomez@proyectohs.com',       direccion:'Calle 80 # 15-20',   contrasena:'123456', especializacion:null, tipo:null, rol:'recepcionista', fecha_registro: now },
      { id_usuario:'REC002', nombre:'Andrea',   apellidos:'Martinez Lopez',   telefono:'3012223344', correo:'andrea.martinez@proyectohs.com',   direccion:'Carrera 13 # 72-15', contrasena:'123456', especializacion:null, tipo:null, rol:'recepcionista', fecha_registro: now },
      { id_usuario:'REC003', nombre:'Carlos',   apellidos:'Torres Perez',     telefono:'3023334455', correo:'carlos.torres@proyectohs.com',     direccion:'Calle 100 # 18-30',  contrasena:'123456', especializacion:null, tipo:null, rol:'recepcionista', fecha_registro: now },
      { id_usuario:'ADM001', nombre:'Juan',     apellidos:'Rodriguez Sanchez',telefono:'3104445566', correo:'juan.rodriguez@proyectohs.com',    direccion:'Carrera 7 # 85-20',  contrasena:'123456', especializacion:null, tipo:null, rol:'admin',         fecha_registro: now },
      { id_usuario:'USU001', nombre:'Pedro',    apellidos:'Gonzalez Ramirez', telefono:'3115556677', correo:'pedro.gonzalez@gmail.com',         direccion:'Calle 45 # 20-10',   contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU002', nombre:'Maria',    apellidos:'Lopez Hernandez',  telefono:'3126667788', correo:'maria.lopez@gmail.com',            direccion:'Carrera 30 # 45-25', contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU003', nombre:'Andres',   apellidos:'Martinez Castro',  telefono:'3137778899', correo:'andres.martinez@gmail.com',        direccion:'Calle 60 # 25-15',   contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU004', nombre:'Diana',    apellidos:'Perez Moreno',     telefono:'3148889900', correo:'diana.perez@gmail.com',            direccion:'Carrera 50 # 80-20', contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU005', nombre:'Felipe',   apellidos:'Sanchez Torres',   telefono:'3159990011', correo:'felipe.sanchez@gmail.com',         direccion:'Calle 72 # 40-18',   contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU006', nombre:'Natalia',  apellidos:'Ramirez Vargas',   telefono:'3161112233', correo:'natalia.ramirez@gmail.com',        direccion:'Carrera 19 # 65-30', contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU007', nombre:'Santiago', apellidos:'Moreno Diaz',      telefono:'3172223344', correo:'santiago.moreno@gmail.com',        direccion:'Calle 90 # 22-40',   contrasena:'123456', especializacion:null, tipo:'principal', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU008', nombre:'Camila',   apellidos:'Vargas Ruiz',      telefono:'3183334455', correo:'camila.vargas@gmail.com',          direccion:'Carrera 11 # 60-25', contrasena:'123456', especializacion:null, tipo:'acudiente', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU009', nombre:'Ricardo',  apellidos:'Diaz Herrera',     telefono:'3194445566', correo:'ricardo.diaz@gmail.com',           direccion:'Calle 35 # 15-40',   contrasena:'123456', especializacion:null, tipo:'acudiente', rol:'usuario', fecha_registro: now },
      { id_usuario:'USU010', nombre:'Valentina',apellidos:'Ruiz Molina',      telefono:'3205556677', correo:'valentina.ruiz@gmail.com',         direccion:'Carrera 40 # 70-10', contrasena:'123456', especializacion:null, tipo:'acudiente', rol:'usuario', fecha_registro: now },
      { id_usuario:'ESP001', nombre:'Alejandro',apellidos:'Castillo Moreno',  telefono:'3211112233', correo:'alejandro.castillo@proyectohs.com',direccion:'Carrera 15 # 80-25', contrasena:'123456', especializacion:'Medicina Veterinaria General', tipo:null, rol:'especialista', fecha_registro: now },
      { id_usuario:'ESP002', nombre:'Carolina', apellidos:'Mendez Torres',    telefono:'3222223344', correo:'carolina.mendez@proyectohs.com',   direccion:'Calle 90 # 18-35',   contrasena:'123456', especializacion:'Medicina Felina',             tipo:null, rol:'especialista', fecha_registro: now },
      { id_usuario:'ESP003', nombre:'Mauricio', apellidos:'Rojas Hernandez',  telefono:'3233334455', correo:'mauricio.rojas@proyectohs.com',    direccion:'Carrera 50 # 75-40', contrasena:'123456', especializacion:'Cirugia Veterinaria',         tipo:null, rol:'especialista', fecha_registro: now },
    ]);

    await queryInterface.bulkInsert('raza', [
      { nombre: 'Labrador Retriever', fecha_registro: now },
      { nombre: 'Golden Retriever',   fecha_registro: now },
      { nombre: 'Pastor Alemán',      fecha_registro: now },
      { nombre: 'Bulldog Francés',    fecha_registro: now },
      { nombre: 'Beagle',             fecha_registro: now },
      { nombre: 'Poodle',             fecha_registro: now },
      { nombre: 'Chihuahua',          fecha_registro: now },
      { nombre: 'Husky Siberiano',    fecha_registro: now },
      { nombre: 'Persa',              fecha_registro: now },
      { nombre: 'Siamés',             fecha_registro: now },
      { nombre: 'Maine Coon',         fecha_registro: now },
      { nombre: 'Bengalí',            fecha_registro: now },
      { nombre: 'Angora',             fecha_registro: now },
      { nombre: 'British Shorthair',  fecha_registro: now },
    ]);

    await queryInterface.sequelize.query(`
      INSERT INTO mascota (nombre, fecha_nacimiento, especie, genero, id_raza) VALUES
      ('Max',   '2021-03-15','perro','macho', (SELECT id_raza FROM raza WHERE nombre='Labrador Retriever')),
      ('Luna',  '2022-07-10','gato','hembra', (SELECT id_raza FROM raza WHERE nombre='Persa')),
      ('Rocky', '2020-11-05','perro','macho', (SELECT id_raza FROM raza WHERE nombre='Pastor Alemán')),
      ('Nala',  '2023-01-20','gato','hembra', (SELECT id_raza FROM raza WHERE nombre='Siamés')),
      ('Bruno', '2019-08-12','perro','macho', (SELECT id_raza FROM raza WHERE nombre='Golden Retriever')),
      ('Mia',   '2022-05-18','gato','hembra', (SELECT id_raza FROM raza WHERE nombre='Maine Coon')),
      ('Toby',  '2021-09-25','perro','macho', (SELECT id_raza FROM raza WHERE nombre='Beagle')),
      ('Coco',  '2023-04-14','gato','hembra', (SELECT id_raza FROM raza WHERE nombre='Bengalí')),
      ('Zeus',  '2020-02-28','perro','macho', (SELECT id_raza FROM raza WHERE nombre='Husky Siberiano')),
      ('Kira',  '2022-12-03','perro','hembra',(SELECT id_raza FROM raza WHERE nombre='Bulldog Francés'));
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO usuario_mascota (id_usuario, id_mascota)
      SELECT 'USU001', id_mascota FROM mascota WHERE nombre IN ('Max','Luna')
      UNION ALL SELECT 'USU002', id_mascota FROM mascota WHERE nombre='Rocky'
      UNION ALL SELECT 'USU003', id_mascota FROM mascota WHERE nombre IN ('Nala','Bruno')
      UNION ALL SELECT 'USU004', id_mascota FROM mascota WHERE nombre='Mia'
      UNION ALL SELECT 'USU005', id_mascota FROM mascota WHERE nombre IN ('Toby','Coco')
      UNION ALL SELECT 'USU006', id_mascota FROM mascota WHERE nombre='Zeus'
      UNION ALL SELECT 'USU007', id_mascota FROM mascota WHERE nombre='Kira'
      UNION ALL SELECT 'USU008', id_mascota FROM mascota WHERE nombre IN ('Max','Rocky')
      UNION ALL SELECT 'USU009', id_mascota FROM mascota WHERE nombre IN ('Nala','Toby')
      UNION ALL SELECT 'USU010', id_mascota FROM mascota WHERE nombre IN ('Luna','Zeus');
    `);

    for (const esp of ['ESP001', 'ESP002', 'ESP003']) {
      await queryInterface.sequelize.query(`
        INSERT INTO disponibilidad (id_usuario, fecha, hora, estado)
        SELECT '${esp}', fecha_hora::DATE, fecha_hora::TIME, 'disponible'
        FROM generate_series(
          TIMESTAMP '2026-08-19 08:00:00',
          TIMESTAMP '2026-08-21 17:00:00',
          INTERVAL '1 hour'
        ) AS fecha_hora
        WHERE fecha_hora::TIME BETWEEN TIME '08:00:00' AND TIME '17:00:00';
      `);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      TRUNCATE historia_clinica, cita, disponibilidad, usuario_mascota, mascota, raza, usuario
      RESTART IDENTITY CASCADE;
    `);
  },
};