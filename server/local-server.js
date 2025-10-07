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
  String(req.headers["x-gemini-key"] || req.headers["x-veo-key"] || process.env.GEMINI_API_KEY || process.env.VEO_API_KEY || "");

/* Health */
app.get("/api/health", (_, res) => res.json({ ok:true, service:"pixagen-local", time:new Date().toISOString() }));

/* ---- EXISTING: gemini & veo endpoints (unchanged) ---- */
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { mode = "image", prompt = "", ratio = "1:1", count = 1, target = "image" } = req.body || {};
    const apiKey = getKey(req);
    if (!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const client = new GoogleGenAI({ apiKey });

    if (mode === "enhance") {
      const model = client.models.getGenerativeModel({ model: "gemini-2.5-flash" });
      const resp = await model.generateContent([
        { text: `Improve this ${target} prompt. Return only the improved prompt.` },
        { text: prompt || "" }
      ]);
      return res.json({ status: "ok", result: resp.response.text() });
    }

    const model = client.models.getGenerativeModel({ model: "imagen-3.0-generate-002" });
    const cfg = { contents: [{ role:"user", parts:[{ text: prompt }]}], generationConfig:{ aspectRatio: ratio, outputMimeType:"image/png" } };
    const images = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      const r = await model.generateContent(cfg);
      const part = r.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
    res.json({ status:"ok", images, meta:{ ratio, count } });
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }); }
});

app.post("/api/veo/generate-video", async (req, res) => {
  try {
    const { script = {}, modelId = "veo-3.0", ratio = "9:16", durationSecs = 8, numberOfVideos = 1, generatePeople = false } = req.body || {};
    const apiKey = getKey(req);
    if (!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });
    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: modelId });
    const cfg = { contents:[{ role:"user", parts:[{ text: JSON.stringify(script) }]}], generationConfig:{ aspectRatio: ratio, durationSeconds: durationSecs, videoCount: Math.min(numberOfVideos,2), allowPeople: !!generatePeople } };
    const resp = await model.generateContent(cfg);
    const vid = resp.response.candidates?.[0]?.content?.parts?.find(p=>p.inlineData && p.inlineData.mimeType?.startsWith("video/"));
    if(vid?.inlineData?.data){
      return res.json({ status:"ok", video:`data:${vid.inlineData.mimeType};base64,${vid.inlineData.data}` });
    }
    res.json({ status:"ok", note:"no video blob returned; inspect raw", raw: resp.response.candidates });
  } catch (e) { res.status(500).json({ error: String(e?.message || e) }); }
});

app.post("/api/promo/generate-video", async (req, res) => {
  try {
    const { productName, brand, ratio, duration, vibe, cta, shots = [], overlays = [], referenceImage } = req.body || {};
    const sceneJson = { meta:{ version:1, brand, productName, ratio, duration, vibe }, cta, shots, overlays, referenceImage };
    res.json({ status:"ok", script: sceneJson });
  } catch (e) { res.status(500).json({ error: "Promo montage failed" }); }
});

/* ---- NEW: ANALYZE PRODUCT (Gemini Vision) ---- */
app.post("/api/vision/analyze-product", async (req, res) => {
  try{
    const { imageDataURL } = req.body || {};
    const apiKey = getKey(req);
    if(!apiKey) return res.status(400).json({ error:"Missing key" });
    if(!imageDataURL) return res.status(400).json({ error:"Missing imageDataURL" });

    // split data URL
    const [meta, b64] = imageDataURL.split(",");
    const mime = meta.match(/data:(.*);base64/)[1];

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a product analyst for short-form ads.
Return JSON with keys: category, brandGuess, dominantColors (array), angles (array of suggestions),
materials (array), textOnLabel (string if any), adSuggestions (array of 3 quick ideas).`;

    const resp = await model.generateContent({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { data: b64, mimeType: mime } }
        ]
      }]
    });

    const text = resp.response.text() || "{}";
    let parsed;
    try{ parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    res.json({ ok:true, insights: parsed });
  }catch(e){
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/* ---- NEW: FUSION GENERATE (max 5) ---- */
app.post("/api/fusion/generate", async (req, res) => {
  try{
    const { productDataURL, modelDataURL, context = {}, maxOutputs = 5, ratio = "9:16" } = req.body || {};
    const apiKey = getKey(req);
    if(!apiKey) return res.status(400).json({ error:"Missing key" });
    if(!productDataURL) return res.status(400).json({ error:"Missing productDataURL" });

    const [pMeta, pB64] = productDataURL.split(",");
    const pMime = pMeta.match(/data:(.*);base64/)[1];
    let mB64 = null, mMime = null;
    if(modelDataURL){
      const [mMeta, m] = modelDataURL.split(",");
      mB64 = m; mMime = mMeta.match(/data:(.*);base64/)[1];
    }

    const client = new GoogleGenAI({ apiKey });

    // Use Imagen 3.0 Edit-like prompt via text + refs (here we simulate by text-only composition hint + product image as ref)
    const model = client.models.getGenerativeModel({ model: "imagen-3.0-generate-002" });

    const basePrompt = `
Generate a commercial-ready composite for TikTok ads.
Blend the given product into a lifestyle scene ${mB64 ? "with the provided person model" : ""}.
Keep realistic lighting/shadow, slight depth-of-field, vibrant but natural colors.
Return photorealistic output, no watermark, no text overlay.
Aspect ratio ${ratio}.`;

    const parts = [{ text: basePrompt }];
    // attach product reference
    parts.push({ inlineData: { data: pB64, mimeType: pMime } });
    // attach model reference if provided
    if(mB64) parts.push({ inlineData: { data: mB64, mimeType: mMime } });

    const images = [];
    for(let i=0;i<Math.min(maxOutputs,5);i++){
      const resp = await model.generateContent({
        contents: [{ role:"user", parts }],
        generationConfig: { aspectRatio: ratio, outputMimeType:"image/png" }
      });
      const part = resp.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if(part?.inlineData?.data){
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }

    res.json({ ok:true, images });
  }catch(e){
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.listen(PORT, () => console.log(`✅ pixagen local server http://localhost:${PORT}`));
