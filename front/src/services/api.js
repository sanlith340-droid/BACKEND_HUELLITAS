/* Este archivo será el único encargado de comunicarse con Express. */

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));

  if (usuario) {
    config.headers["x-user-id"] = usuario.id_usuario;
    config.headers["x-user-role"] = usuario.rol;
  }

  return config;
});

export default api;