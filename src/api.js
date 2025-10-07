import axios from "axios";
const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config)=>{
  config.headers["x-gemini-key"] = localStorage.getItem("pg_gemini_key") || "";
  config.headers["x-veo-key"] = localStorage.getItem("pg_veo_key") || "";
  return config;
});

export const ping = ()=>api.get("/health");
export const geminiGenerate = (d)=>api.post("/gemini/generate",d);
export const veoGenerateVideo = (d)=>api.post("/veo/generate-video",d);
export default api;
