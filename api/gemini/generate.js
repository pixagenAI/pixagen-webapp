import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  try {
    const { mode = "image", prompt = "", ratio = "1:1", count = 1, target = "image" } = req.body || {};
    const apiKey = String(req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY || "");
    if(!apiKey) return res.status(400).json({ error: "Missing Google AI Studio API key" });

    const client = new GoogleGenAI({ apiKey });

    if(mode === "enhance"){
      const model = client.models.getGenerativeModel({ model: "gemini-2.5-flash" });
      const resp = await model.generateContent([
        { text: `Improve this ${target} prompt. Return only the improved prompt with no extra commentary.` },
        { text: prompt || "" }
      ]);
      return res.status(200).json({ status: "ok", result: resp.response.text() });
    }

    const model = client.models.getGenerativeModel({ model: "imagen-3.0-generate-002" });
    const cfg = { contents: [{ role:"user", parts:[{ text: prompt }]}], generationConfig:{ aspectRatio: ratio, outputMimeType: "image/png" } };
    const images = [];
    for(let i=0;i<Math.min(count,4);i++){
      const r = await model.generateContent(cfg);
      const part = r.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if(part?.inlineData?.data){
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
      }
    }
    return res.status(200).json({ status:"ok", images, meta:{ ratio, count } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e?.message || e) });
  }
}
