import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res){
  try{
    const apiKey = String(req.headers["x-veo-key"] || req.headers["x-gemini-key"] || process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || "");
    if(!apiKey) return res.status(400).json({ error:"Missing Google AI Studio API key" });

    const {
      model = "veo-3.0",
      aspectRatio = "9:16",
      duration = 8,
      videoCount = 1,
      prompt = "{}"
    } = req.body || {};

    let script; try{ script = JSON.parse(prompt); }catch{ script = { prompt }; }

    const client = new GoogleGenAI({ apiKey });
    const m = client.models.getGenerativeModel({ model });
    const cfg = {
      contents:[{ role:"user", parts:[{ text: JSON.stringify(script) }]}],
      generationConfig:{ aspectRatio, durationSeconds:Number(duration)||8, videoCount: Math.min(Number(videoCount)||1, 2), allowPeople:true }
    };
    const resp = await m.generateContent(cfg);
    const part = resp.response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith("video/"));
    if(part?.inlineData?.data){
      return res.status(200).json({ status:"ok", model, video:`data:${part.inlineData.mimeType};base64,${part.inlineData.data}` });
    }
    res.status(200).json({ status:"ok", note:"no video blob returned", raw: resp.response.candidates });
  }catch(e){
    console.error("Vercel video/generate:", e?.message||e);
    res.status(502).json({ error:String(e?.message||e) });
  }
}
