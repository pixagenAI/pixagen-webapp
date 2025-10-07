import React, { useState } from "react";

export default function ImageStudio({ onLog, onGenerate }){
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState("1:1");
  const [count, setCount] = useState(1);

  const enhance = async ()=>{
    try{
      onLog?.({ action:"IMAGE_ENHANCE_REQUEST", data:{ prompt }});
      const res = await onGenerate({ mode:"enhance", target:"image", prompt });
      const improved = res?.data?.result || "";
      if(improved) setPrompt(improved);
      onLog?.({ action:"IMAGE_ENHANCE_RESPONSE", data: res.data });
    }catch(e){ onLog?.({ action:"IMAGE_ENHANCE_ERROR", error: e?.message || String(e) }); }
  };

  const run = async ()=>{
    try{
      onLog?.({ action:"IMAGE_REQUEST", data:{ prompt, ratio, count }});
      const res = await onGenerate({ mode:"image", prompt, ratio, count });
      onLog?.({ action:"IMAGE_RESPONSE", data: res.data });
      alert("Image generated (check Activity Log).");
    }catch(e){ onLog?.({ action:"IMAGE_ERROR", error: e?.message || String(e) }); }
  };

  return (
    <>
      <div className="card half">
        <div className="label">Prompt</div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe the image..." />
        <div className="stack" style={{marginTop:10}}>
          <div style={{flex:1}}>
            <div className="label">Aspect Ratio</div>
            <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
              <option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option>
            </select>
          </div>
          <div style={{width:120}}>
            <div className="label">Count</div>
            <input className="input" type="number" min="1" max="4" value={count} onChange={e=>setCount(Number(e.target.value))}/>
          </div>
        </div>
        <div className="stack" style={{marginTop:12}}>
          <button className="btn" onClick={enhance}>Enhance Prompt</button>
          <button className="btn primary" onClick={run}>Generate</button>
        </div>
      </div>

      <div className="card half">
        <div className="label">Tips</div>
        <ul className="mini muted">
          <li>Nyatakan lighting, lens, styling, texture.</li>
          <li>Pilih ratio ikut platform (1:1 IG, 9:16 TikTok).</li>
        </ul>
      </div>
    </>
  );
}
