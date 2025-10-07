import axios from "axios";
const api = axios.create({ baseURL: "/api", timeout: 120000 });

api.interceptors.request.use((config)=>{
  const key = localStorage.getItem("pg_ai_key") || "";
  if (key) { config.headers["x-gemini-key"] = key; config.headers["x-veo-key"] = key; }
  return config;
});

// Models
export const listModels = () => api.get("/models");

// Imagen (ikut asal)
export const imagenGenerate = (payload) => api.post("/imagen/generate", payload);

// Gemini
export const geminiText = (payload) => api.post("/gemini/text", payload);
export const geminiVision = (payload) => api.post("/gemini/vision", payload);

// VEO — ikut endpoint asal repo
export const videoGenerate = (payload) => api.post("/video/generate", payload);          // {model, aspectRatio, duration, videoCount, prompt}
export const veoTextToVideo = (payload) => api.post("/veo/text-to-video", payload);

// (Kekalkan helper sedia ada supaya page lain tak rosak)
export const veoGenerateVideo = (payload) => api.post("/veo/generate-video", payload);
export const promoGenerateVideo = (payload) => api.post("/promo/generate-video", payload);
export const ping = () => api.get("/health");

export default api;
