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

/* ---------- Health ---------- */
app.get("/api/health", (_, res) =>
  res.json({ ok: true, service: "pixagen-local", time: new Date().toISOString() })
);

/* ---------- Gemini/Imagen (unchanged) ---------- */
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
    console.error("IMAGEN_ERROR:", e?.message || e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

/* ---------- VEO normalizer ---------- */
function normalizeVideoBody(body = {}) {
  // accept many shapes from various repos
  const script =
    body.script ?? body.scene ?? body.payload ?? (body.prompt ? { prompt: body.prompt } : {});
  const ratio =
    body.ratio ?? body.aspectRatio ?? body.ar ?? "9:16";
  const durationSecs =
    body.durationSecs ?? body.duration ?? body.length ?? 8;
  const numberOfVideos =
    body.numberOfVideos ?? body.count ?? body.videoCount ?? 1;
  const modelId =
    body.modelId ?? body.model ?? "veo-3.0";
  const generatePeople =
    body.generatePeople ?? body.allowPeople ?? false;

  return { script, ratio, durationSecs, numberOfVideos, modelId, generatePeople };
}

async function handleVeo(req, res) {
  try {
    const apiKey = getKey(req);
    if (!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const { script, ratio, durationSecs, numberOfVideos, modelId, generatePeople } =
      normalizeVideoBody(req.body);

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: modelId });

    const cfg = {
      contents: [{ role: "user", parts: [{ text: JSON.stringify(script || {}) }]}],
      generationConfig: {
        aspectRatio: ratio,
        durationSeconds: Number(durationSecs) || 8,
        videoCount: Math.min(Number(numberOfVideos) || 1, 2),
        allowPeople: !!generatePeople
      }
    };

    const resp = await model.generateContent(cfg).catch((err) => {
      // Surface provider message cleanly
      throw new Error(err?.message || "VEO request failed");
    });

    const parts = resp?.response?.candidates?.[0]?.content?.parts || [];
    const vid = parts.find(
      (p) => p.inlineData && typeof p.inlineData.data === "string" && p.inlineData.mimeType?.startsWith("video/")
    );
    if (vid?.inlineData?.data) {
      return res.json({
        status: "ok",
        provider: "veo",
        video: `data:${vid.inlineData.mimeType};base64,${vid.inlineData.data}`,
        meta: { modelId, ratio, durationSecs, numberOfVideos, generatePeople }
      });
    }

    return res.status(200).json({
      status: "ok",
      note: "No video blob returned; inspect raw",
      raw: resp?.response?.candidates,
      meta: { modelId, ratio, durationSecs, numberOfVideos, generatePeople }
    });
  } catch (e) {
    console.error("VEO_ERROR:", e?.message || e);
    res.status(502).json({ error: String(e?.message || e) });
  }
}

/* ---------- VEO routes (compat aliases) ---------- */
app.post("/api/veo/generate-video", handleVeo); // PixaGen current
app.post("/api/veo/generate", handleVeo);       // alias
app.post("/api/video/generate", handleVeo);     // alias seen in many repos
app.post("/api/ai/veo", handleVeo);             // alias

/* ---------- Promo script (unchanged) ---------- */
app.post("/api/promo/generate-video", async (req, res) => {
  try {
    const { productName, brand, ratio, duration, vibe, cta, shots = [], overlays = [], referenceImage } = req.body || {};
    const sceneJson = { meta: { version: 1, brand, productName, ratio, duration, vibe }, cta, shots, overlays, referenceImage };
    res.json({ status: "ok", script: sceneJson });
  } catch (e) {
    console.error("PROMO_ERROR:", e?.message || e);
    res.status(500).json({ error: "Promo montage failed" });
  }
});

app.listen(PORT, () =>
  console.log(`✅ pixagen local server http://localhost:${PORT}`)
);
