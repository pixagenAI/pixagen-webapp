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
    req.headers["x-gemini-key"] ||
    req.headers["x-veo-key"] ||
    process.env.GEMINI_API_KEY ||
    process.env.VEO_API_KEY ||
    ""
  );

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "pixagen-local", time: new Date().toISOString() });
});

/** ---------- GEMINI / IMAGEN ---------- */
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { mode = "image", prompt = "", ratio = "1:1", count = 1, target = "image" } = req.body || {};
    const apiKey = getKey(req);
    if (!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const client = new GoogleGenAI({ apiKey });

    if (mode === "enhance") {
      const model = client.models.getGenerativeModel({ model: "gemini-2.5-flash" });
      const resp = await model.generateContent([
        { text: `Improve this ${target} prompt. Return only the improved prompt with no extra commentary.` },
        { text: prompt || "" }
      ]);
      return res.json({ status: "ok", result: resp.response.text() });
    }

    const model = client.models.getGenerativeModel({ model: "imagen-3.0-generate-002" });
    const cfg = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { aspectRatio: ratio, outputMimeType: "image/png" }
    };
    const images = [];
    for (let i = 0; i < Math.min(count, 4); i++) {
      const r = await model.generateContent(cfg);
      const part = r.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (part?.inlineData?.data) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
    res.json({ status: "ok", images, meta: { ratio, count, modelId: "imagen-3.0-generate-002" } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/** ---------- VEO (multi-model) ---------- */
app.post("/api/veo/generate-video", async (req, res) => {
  try {
    const {
      script = {},
      modelId = "veo-3.0",
      ratio = "9:16",
      durationSecs = 8,
      numberOfVideos = 1,
      generatePeople = false
    } = req.body || {};

    const apiKey = getKey(req);
    if (!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: modelId });

    const cfg = {
      contents: [{ role: "user", parts: [{ text: JSON.stringify(script) }]}],
      generationConfig: {
        aspectRatio: ratio,
        durationSeconds: durationSecs,
        videoCount: Math.min(numberOfVideos, 2),
        allowPeople: !!generatePeople
      }
    };

    const resp = await model.generateContent(cfg);
    const part = resp.response.candidates?.[0]?.content?.parts?.find(
      p => p.inlineData && p.inlineData.mimeType?.startsWith("video/")
    );

    if (part?.inlineData?.data) {
      return res.json({
        status: "ok",
        provider: "veo",
        video: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        meta: { modelId, ratio, durationSecs, numberOfVideos, generatePeople }
      });
    }

    res.json({ status: "ok", note: "no video blob returned; inspect raw", raw: resp.response.candidates, meta: { modelId } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/** ---------- PROMO SCRIPT BUILDER ---------- */
app.post("/api/promo/generate-video", async (req, res) => {
  try {
    const { productName, brand, ratio, duration, vibe, cta, shots = [], overlays = [] } = req.body || {};
    const sceneJson = { meta: { version: 1, brand, productName, ratio, duration, vibe }, cta, shots, overlays };
    res.json({ status: "ok", script: sceneJson });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Promo montage failed" });
  }
});

app.listen(PORT, () => console.log(`✅ pixagen local server http://localhost:${PORT}`));
