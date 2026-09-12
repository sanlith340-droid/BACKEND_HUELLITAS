import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { FaCalendarAlt, FaClock, FaUserMd } from "react-icons/fa";

function formatearFecha(fechaISO) {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  return fecha.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function NuevaCita() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [mascotas, setMascotas] = useState([]);
  const [disponibilidad, setDisponibilidad] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [idMascota, setIdMascota] = useState("");
  const [idDisponibilidad, setIdDisponibilidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      setError("");

      try {
        const [resMascotas, resDisponibilidad] = await Promise.all([
          api.get("/mascotas"),
          api.get("/disponibilidad", { params: { estado: "disponible" } }),
        ]);

        const misMascotas = (resMascotas.data.data || []).filter(
          (m) => m.propietario_id === usuario?.id_usuario
        );

        setMascotas(misMascotas);
        setDisponibilidad(resDisponibilidad.data.data || []);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "No se pudo cargar la disponibilidad. Verifica que el backend esté activo."
        );
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [usuario]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje("");

    if (!idMascota || !idDisponibilidad || !motivo.trim()) {
      setMensaje("Selecciona tu mascota, un horario y escribe el motivo de la cita.");
      return;
    }

    setEnviando(true);

    try {
      await api.post("/citas", {
        id_mascota: Number(idMascota),
        id_disponibilidad: Number(idDisponibilidad),
        motivo: motivo.trim(),
      });

      navigate("/dashboard");
    } catch (err) {
      setMensaje(err.response?.data?.message || "No se pudo agendar la cita.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container">
      <div className="form-page">
        <Link to="/dashboard" className="back-link">
          ← Volver a mi panel
        </Link>

        <h1>Agendar cita</h1>
        <p className="auth-card__subtitle">
          Elige un horario disponible, la mascota y cuéntanos el motivo de la consulta.
        </p>

        {error && <p className="message message-error">{error}</p>}

        {!error && cargando && <p className="empty-state">Cargando disponibilidad...</p>}

        {!error && !cargando && mascotas.length === 0 && (
          <p className="message message-error">
            Primero necesitas registrar una mascota. <Link to="/mascotas/nueva">Regístrala aquí</Link>.
          </p>
        )}

        {!error && !cargando && mascotas.length > 0 && (
          <form onSubmit={handleSubmit} noValidate>
            <h2 className="section-title">1. Elige un horario</h2>

            {disponibilidad.length === 0 ? (
              <p className="empty-state">No hay horarios disponibles por el momento.</p>
            ) : (
              <div className="slot-grid">
                {disponibilidad.map((slot) => (
                  <button
                    type="button"
                    key={slot.id_disponibilidad}
                    className={`slot-card ${
                      idDisponibilidad === String(slot.id_disponibilidad) ? "slot-card--selected" : ""
                    }`}
                    onClick={() => setIdDisponibilidad(String(slot.id_disponibilidad))}
                  >
                    <div className="slot-card__specialist">
                      <FaUserMd /> {slot.especialista_nombre} {slot.especialista_apellidos}
                    </div>
                    <div className="slot-card__meta">
                      <span>
                        <FaCalendarAlt /> {formatearFecha(slot.fecha)}
                      </span>
                      <span>
                        <FaClock /> {slot.hora}
                      </span>
                    </div>
                    {slot.especializacion && (
                      <span className="badge">{slot.especializacion}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <h2 className="section-title">2. Datos de la cita</h2>

            <div className="field">
              <label htmlFor="id_mascota">Mascota</label>
              <select
                id="id_mascota"
                value={idMascota}
                onChange={(e) => setIdMascota(e.target.value)}
                required
              >
                <option value="" disabled>
                  Selecciona tu mascota
                </option>
                {mascotas.map((m) => (
                  <option key={m.id_mascota} value={m.id_mascota}>
                    {m.mascota}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="motivo">Motivo de la consulta</label>
              <input
                id="motivo"
                type="text"
                placeholder="Ej. Control de vacunas"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <button className="btn btn-primary" disabled={enviando}>
              {enviando ? "Agendando..." : "Confirmar cita"}
            </button>

            {mensaje && <p className="message message-error">{mensaje}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default NuevaCita;
