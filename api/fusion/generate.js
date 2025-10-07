import { GoogleGenAI } from "@google/genai";

export default async function handler(req,res){
  try{
    const { productDataURL, modelDataURL, context = {}, maxOutputs = 5, ratio = "9:16" } = req.body || {};
    const apiKey = String(req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY || "");
    if(!apiKey) return res.status(400).json({ error:"Missing key" });
    if(!productDataURL) return res.status(400).json({ error:"Missing productDataURL" });

    const [pMeta, pB64] = productDataURL.split(",");
    const pMime = pMeta.match(/data:(.*);base64/)[1];
    let mB64=null, mMime=null;
    if(modelDataURL){
      const [mMeta, m] = modelDataURL.split(",");
      mB64 = m; mMime = mMeta.match(/data:(.*);base64/)[1];
    }

    const client = new GoogleGenAI({ apiKey });
    const model = client.models.getGenerativeModel({ model:"imagen-3.0-generate-002" });

    const basePrompt = `Generate a commercial-ready composite for TikTok ads.
Blend the given product into a lifestyle scene ${mB64 ? "with the provided person model" : ""}.
Realistic lighting/shadow, shallow DOF, vibrant but natural. No text/watermark. Aspect ratio ${ratio}.`;

    const parts = [{ text: basePrompt }, { inlineData:{ data:pB64, mimeType:pMime } }];
    if(mB64) parts.push({ inlineData:{ data:mB64, mimeType:mMime } });

    const images = [];
    for(let i=0;i<Math.min(maxOutputs,5);i++){
      const r = await model.generateContent({
        contents:[{ role:"user", parts }],
        generationConfig:{ aspectRatio: ratio, outputMimeType:"image/png" }
      });
      const part = r.response.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
      if(part?.inlineData?.data) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }

    res.status(200).json({ ok:true, images });
  }catch(e){ res.status(500).json({ error:String(e?.message||e) }); }
}
