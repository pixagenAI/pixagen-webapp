import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "25mb" }));
app.use(morgan("dev"));

const getKey = (req) =>
  String(
    req.headers["x-veo-key"] ||
    req.headers["x-gemini-key"] ||
    process.env.VEO_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ""
  );

// ---- Health
app.get("/api/health", (_, res) =>
  res.json({ ok:true, service:"pixagen-local", time:new Date().toISOString() })
);

// ---- Models list (ikut repo asal style)
app.get("/api/models", (_, res) => {
  res.json({
    veo: ["veo-3.0", "veo-3.0-lite", "veo-3.0-pro"],
    imagen: ["imagen-3.0-generate-002"],
    gemini: ["gemini-2.5-flash"]
  });
});

// ---- Imagen generate (ikut asal: /api/imagen/generate)
app.post("/api/imagen/generate", async (req, res) => {
  try {
    const { prompt = "", aspectRatio = "1:1", count = 1, outputMimeType = "image/png" } = req.body || {};
    const apiKey = getKey(req); if(!apiKey) return res.status(400).json({ error:"Missing Google AI Studio API key" });
    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: "imagen-3.0-generate-002" });
    const cfg = { contents:[{ role:"user", parts:[{ text: prompt }]}], generationConfig:{ aspectRatio, outputMimeType } };
    const images = [];
    for (let i = 0; i < Math.min(Number(count)||1, 4); i++) {
      const r = await model.generateContent(cfg);
      const part = r.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
    res.json({ status:"ok", images, meta:{ aspectRatio, count } });
  } catch (e) { res.status(500).json({ error:String(e?.message||e) }); }
});

// ---- Gemini text/vision (ikut asal: /api/gemini/text, /api/gemini/vision)
app.post("/api/gemini/text", async (req, res) => {
  try{
    const { prompt = "" } = req.body || {};
    const apiKey = getKey(req); if(!apiKey) return res.status(400).json({ error:"Missing key" });
    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: "gemini-2.5-flash" });
    const r = await model.generateContent([{ text: prompt }]);
    res.json({ status:"ok", text: r.response.text() });
  }catch(e){ res.status(500).json({ error:String(e?.message||e) }); }
});

app.post("/api/gemini/vision", async (req, res) => {
  try{
    const { imageDataURL } = req.body || {};
    const apiKey = getKey(req); if(!apiKey) return res.status(400).json({ error:"Missing key" });
    const m = imageDataURL?.match(/^data:(.*);base64,(.*)$/);
    if(!m) return res.status(400).json({ error:"Invalid dataURL" });
    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model:"gemini-2.5-flash" });
    const prompt = `You are a product analyst for short-form ads.
Return strict JSON: {category, brandGuess, dominantColors[], angles[], materials[], textOnLabel, adSuggestions[]}`;
    const r = await model.generateContent({
      contents:[{ role:"user", parts:[ { text: prompt }, { inlineData:{ data:m[2], mimeType:m[1] } } ] }]
    });
    let parsed; try{ parsed = JSON.parse(r.response.text()||"{}"); } catch { parsed = { raw: r.response.text() }; }
    res.json({ ok:true, insights: parsed });
  }catch(e){ res.status(500).json({ error:String(e?.message||e) }); }
});

// ---- VEO: ikut endpoint asal
// A) /api/video/generate   (payload: model, aspectRatio, duration, videoCount, prompt(string JSON))
// B) /api/veo/text-to-video (sama je)
async function runVeo(req, res){
  try{
    const apiKey = getKey(req); if(!apiKey) return res.status(400).json({ error:"Missing Google AI Studio API key" });
    const {
      model = "veo-3.0",
      aspectRatio = "9:16",
      duration = 8,
      videoCount = 1,
      prompt = "{}" // string JSON or plain text
    } = req.body || {};

    // Normalise script
    let script; try { script = JSON.parse(prompt); } catch { script = { prompt }; }

    const client = new GoogleGenAI({ apiKey });
    const m = client.models.getGenerativeModel({ model });
    const cfg = {
      contents: [{ role:"user", parts:[{ text: JSON.stringify(script) }]}],
      generationConfig: {
        aspectRatio,
        durationSeconds: Number(duration)||8,
        videoCount: Math.min(Number(videoCount)||1, 2),
        allowPeople: true
      }
    };
    const resp = await m.generateContent(cfg);
    const part = resp.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith("video/"));
    if(part?.inlineData?.data){
      return res.json({ status:"ok", model, video:`data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
    }
    res.json({ status:"ok", note:"no video blob returned", raw: resp.response.candidates });
  }catch(e){
    console.error("VEO_ERROR:", e?.message||e);
    res.status(502).json({ error:String(e?.message||e) });
  }
}
app.post("/api/video/generate", runVeo);
app.post("/api/veo/text-to-video", runVeo);

// ---- Legacy PixaGen routes (still kept, map ke atas)
app.post("/api/veo/generate-video", (req,res)=>{
  const body = req.body||{};
  return runVeo({
    ...req,
    body: {
      model: body.modelId || "veo-3.0",
      aspectRatio: body.ratio || "9:16",
      duration: body.durationSecs || body.duration || 8,
      videoCount: body.numberOfVideos || 1,
      prompt: JSON.stringify(body.script || { prompt:"" })
    }
  }, res);
});

app.listen(PORT, () => console.log(`✅ pixagen local server http://localhost:${PORT}`));
