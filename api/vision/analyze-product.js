import { GoogleGenAI } from "@google/genai";

export default async function handler(req,res){
  try{
    const { imageDataURL } = req.body || {};
    const apiKey = String(req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY || "");
    if(!apiKey) return res.status(400).json({ error:"Missing key" });
    if(!imageDataURL) return res.status(400).json({ error:"Missing imageDataURL" });

    const [meta, b64] = imageDataURL.split(",");
    const mime = meta.match(/data:(.*);base64/)[1];

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model:"gemini-2.5-flash" });

    const prompt = `You are a product analyst for short-form ads.
Return JSON with keys: category, brandGuess, dominantColors (array), angles (array),
materials (array), textOnLabel (string), adSuggestions (array of 3 quick ideas).`;

    const resp = await model.generateContent({
      contents: [{ role:"user", parts:[ { text: prompt }, { inlineData: { data:b64, mimeType:mime } } ] }]
    });

    const text = resp.response.text() || "{}";
    let parsed; try{ parsed = JSON.parse(text); } catch{ parsed = { raw: text }; }

    res.status(200).json({ ok:true, insights: parsed });
  }catch(e){ res.status(500).json({ error:String(e?.message||e) }); }
}
