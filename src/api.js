import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 120000 });

api.interceptors.request.use((config)=>{
  const key = localStorage.getItem("pg_ai_key") || "";
  if (key) {
    config.headers["x-gemini-key"] = key;
    config.headers["x-veo-key"] = key;
  }
  return config;
});

export const ping = () => api.get("/health");

export const geminiGenerate = (payload) => api.post("/gemini/generate", payload);
export const veoGenerateVideo = (payload) => api.post("/veo/generate-video", payload);
export const promoGenerateVideo = (payload) => api.post("/promo/generate-video", payload);

// ✅ NEW: analyze product image (Gemini Vision)
export const analyzeProduct = (payload) => api.post("/vision/analyze-product", payload);

// ✅ NEW: generate up to 5 fused images
export const fusionGenerate = (payload) => api.post("/fusion/generate", payload);

export default api;
