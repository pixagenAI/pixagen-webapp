import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 120000 });

// Inject ONE Google AI Studio key for all (Gemini/Imagen/VEO)
api.interceptors.request.use((config) => {
  const key = localStorage.getItem("pg_ai_key") || "";
  if (key) {
    config.headers["x-gemini-key"] = key;
    config.headers["x-veo-key"] = key;
  }
  return config;
});

export const ping = () => api.get("/health");

// Gemini / Imagen
export const geminiGenerate = (payload) =>
  api.post("/gemini/generate", payload);

// VEO video
export const veoGenerateVideo = (payload) =>
  api.post("/veo/generate-video", payload);

// 🔥 Promo builder (script JSON -> used by ProductFusion.jsx)
export const promoGenerateVideo = (payload) =>
  api.post("/promo/generate-video", payload);

export default api;
