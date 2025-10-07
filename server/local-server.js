import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "pixagen-local" }));

// ✅ Gemini & Imagen
app.post("/api/gemini/generate", async (req, res) => {
  try {
    const { mode="image", prompt="", ratio="1:1", count=1 } = req.body;
    const key = req.headers["x-gemini-key"] || process.env.GEMINI_API_KEY;
    if(!key) return res.status(400).json({ error:"Missing key" });
    const client = new GoogleGenAI({ apiKey:key });
    if(mode==="enhance"){
      const model = client.models.getGenerativeModel({ model:"gemini-2.5-flash" });
      const resp = await model.generateContent([{text:`Enhance this ${prompt}`}]);
      return res.json({ result:resp.response.text() });
    }
    const model = client.models.getGenerativeModel({ model:"imagen-3.0-generate-002" });
    const images = [];
    for(let i=0;i<count;i++){
      const r = await model.generateContent([{role:"user",parts:[{text:prompt}]}]);
      const part = r.response.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
      if(part?.inlineData?.data)
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
    res.json({ images });
  } catch(e){ res.status(500).json({ error:e.message }); }
});

// ✅ VEO
app.post("/api/veo/generate-video", async (req, res)=>{
  try{
    const { script={}, ratio="9:16", durationSecs=8 } = req.body;
    const key = req.headers["x-veo-key"] || process.env.VEO_API_KEY;
    if(!key) return res.status(400).json({ error:"Missing key" });
    const client = new GoogleGenAI({ apiKey:key });
    const model = client.models.getGenerativeModel({ model:"veo-3.0" });
    const cfg = { contents:[{role:"user",parts:[{text:JSON.stringify(script)}]}], generationConfig:{aspectRatio:ratio, durationSeconds:durationSecs}};
    const resp = await model.generateContent(cfg);
    const vid = resp.response.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
    res.json({ video:`data:${vid.inlineData.mimeType};base64,${vid.inlineData.data}` });
  }catch(e){ res.status(500).json({ error:e.message }); }
});

app.listen(PORT, ()=>console.log("✅ Local server on",PORT));
