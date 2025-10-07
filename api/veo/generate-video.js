import { GoogleGenAI } from "@google/genai";

function normalizeVideoBody(body = {}) {
  const script = body.script ?? body.scene ?? body.payload ?? (body.prompt ? { prompt: body.prompt } : {});
  const ratio = body.ratio ?? body.aspectRatio ?? body.ar ?? "9:16";
  const durationSecs = body.durationSecs ?? body.duration ?? body.length ?? 8;
  const numberOfVideos = body.numberOfVideos ?? body.count ?? body.videoCount ?? 1;
  const modelId = body.modelId ?? body.model ?? "veo-3.0";
  const generatePeople = body.generatePeople ?? body.allowPeople ?? false;
  return { script, ratio, durationSecs, numberOfVideos, modelId, generatePeople };
}

export default async function handler(req, res) {
  try {
    const apiKey = String(
      req.headers["x-veo-key"] ||
      req.headers["x-gemini-key"] ||
      process.env.VEO_API_KEY ||
      process.env.GEMINI_API_KEY ||
      ""
    );
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

    const resp = await model.generateContent(cfg);
    const parts = resp?.response?.candidates?.[0]?.content?.parts || [];
    const vid = parts.find(
      (p) => p.inlineData && typeof p.inlineData.data === "string" && p.inlineData.mimeType?.startsWith("video/")
    );

    if (vid?.inlineData?.data) {
      return res.status(200).json({
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
    console.error("Vercel VEO error:", e?.message || e);
    res.status(502).json({ error: String(e?.message || e) });
  }
}
