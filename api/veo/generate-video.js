import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const { script = {}, ratio = "9:16", durationSecs = 8, numberOfVideos = 1, generatePeople = false } = req.body || {};
    const apiKey = String(req.headers["x-veo-key"] || req.headers["x-gemini-key"] || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || "");
    if(!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model: "veo-3.0" });
    const cfg = {
      contents: [{ role: "user", parts: [{ text: JSON.stringify(script) }]}],
      generationConfig: { aspectRatio: ratio, durationSeconds: durationSecs, videoCount: Math.min(numberOfVideos, 2), allowPeople: !!generatePeople }
    };
    const resp = await model.generateContent(cfg);
    const first = resp.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith("video/"));
    if(first?.inlineData?.data){
      return res.status(200).json({ status:"ok", video:`data:${first.inlineData.mimeType};base64,${first.inlineData.data}` });
    }
    return res.status(200).json({ status:"ok", note:"no video blob returned; inspect raw", raw: resp.response.candidates });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
