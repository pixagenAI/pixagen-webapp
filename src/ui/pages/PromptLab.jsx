import React, { useState } from "react";

export default function PromptLab({ onLog, onGemini }){
  const [text, setText] = useState("");
  const [mode, setMode] = useState("image");

  const enhance = async ()=>{
    onLog?.({ action:"PROMPT_LAB_ENHANCE", data:{ mode, text }});
    try{
      const res = await onGemini({ mode:"enhance", target:mode, prompt:text });
      onLog?.({ action:"PROMPT_LAB_RESPONSE", data: res.data });
      const improved = res?.data?.result;
      if(improved) setText(improved);
    }catch(e){
      onLog?.({ action:"PROMPT_LAB_ERROR", error: e?.message || String(e) });
    }
  };

  return (
    <>
      <div className="card half">
        <div className="label">Target</div>
        <select className="input" value={mode} onChange={e=>setMode(e.target.value)}>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <div className="label" style={{marginTop:10}}>Your Prompt</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Drop your idea here..."/>
        <div className="stack" style={{marginTop:12}}>
          <button className="btn primary" onClick={enhance}>Enhance</button>
        </div>
      </div>
      <div className="card half">
        <div className="label">Tips</div>
        <ul className="mini muted">
          <li>Spesifikkan subjek, gaya, kamera, lighting, mood.</li>
          <li>Untuk video: pecahkan shot 3–8s.</li>
        </ul>
      </div>
    </>
  );
}
