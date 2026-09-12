'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION actualizar_disponibilidad_cita()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE disponibilidad
        SET estado = 'ocupado'
        WHERE id_disponibilidad = NEW.id_disponibilidad;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_actualizar_disponibilidad_cita
      AFTER INSERT ON cita
      FOR EACH ROW EXECUTE FUNCTION actualizar_disponibilidad_cita();

      CREATE OR REPLACE FUNCTION actualizar_cita_atendida()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE cita SET estado = 'atendido' WHERE id_cita = NEW.id_cita;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_historia_cita_atendida
      AFTER INSERT ON historia_clinica
      FOR EACH ROW EXECUTE FUNCTION actualizar_cita_atendida();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_historia_cita_atendida ON historia_clinica;
      DROP TRIGGER IF EXISTS trg_actualizar_disponibilidad_cita ON cita;
      DROP FUNCTION IF EXISTS actualizar_cita_atendida();
      DROP FUNCTION IF EXISTS actualizar_disponibilidad_cita();
    `);
  },
};