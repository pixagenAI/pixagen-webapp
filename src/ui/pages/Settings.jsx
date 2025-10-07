import React, { useState } from "react";

export default function Settings({ onLog }){
  const [key, setKey] = useState(localStorage.getItem("pg_ai_key") || "");

  const save = ()=>{
    localStorage.setItem("pg_ai_key", key.trim());
    onLog?.({ action:"SAVE_API_KEY", data:{ key: key ? "•••" : "" }});
    alert("API key saved to this browser (localStorage).");
  };

  const clearKeys = ()=>{
    localStorage.removeItem("pg_ai_key");
    setKey("");
    onLog?.({ action:"CLEAR_API_KEY" });
  };

  return (
    <div className="card">
      <h3 style={{marginTop:0}}>API Key</h3>
      <p className="mini muted">Guna <b>1 key</b> untuk Gemini / Imagen / VEO (Google AI Studio). Dihantar dalam header setiap request.</p>
      <div className="label">Google AI Studio API Key</div>
      <input className="input" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="paste-your-key-here" />
      <div className="stack" style={{marginTop:12}}>
        <button className="btn primary" onClick={save}>Save</button>
        <button className="btn" onClick={clearKeys}>Clear</button>
      </div>
    </div>
  );
}
