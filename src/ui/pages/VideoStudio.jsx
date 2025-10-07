import React, { useEffect, useState } from "react";
import { listModels, videoGenerate } from "../../api";

export default function VideoStudio({ onLog }){
  const [models, setModels] = useState(["veo-3.0"]);
  const [model, setModel] = useState("veo-3.0");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [count, setCount] = useState(1);
  const [script, setScript] = useState("");

  useEffect(()=>{
    listModels().then(r=>{
      const arr = r?.data?.veo || ["veo-3.0"];
      setModels(arr);
      if(!arr.includes(model)) setModel(arr[0]);
    }).catch(()=>{});
  },[]);

  const example = ()=>{
    const s = {
      shots: [
        { start:0, duration:3, instruction:"Product hero on table, cinematic lighting" },
        { start:3, duration:3, instruction:"Macro texture close-up" },
        { start:6, duration:2, instruction:"Logo + CTA overlay" }
      ]
    };
    setScript(JSON.stringify(s, null, 2));
  };

  const run = async ()=>{
    try{
      const payload = {
        model,
        aspectRatio: ratio,
        duration,
        videoCount: count,
        prompt: script?.trim() ? script : "{}"
      };
      onLog?.({ action:"VIDEO_REQUEST_ORIG", data: payload });
      const res = await videoGenerate(payload);
      onLog?.({ action:"VIDEO_RESPONSE_ORIG", data: res.data });
      alert("Video request dihantar (endpoint asal). Rujuk Activity Log.");
    }catch(e){
      onLog?.({ action:"VIDEO_ERROR_ORIG", error: e?.response?.data || e?.message || String(e) });
      alert("Gagal generate (endpoint asal).");
    }
  };

  return (
    <>
      <div className="card half">
        <div className="label">VEO Model</div>
        <select className="input" value={model} onChange={e=>setModel(e.target.value)}>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div className="label" style={{marginTop:10}}>Script / Prompt (JSON)</div>
        <textarea value={script} onChange={e=>setScript(e.target.value)} placeholder='{"shots":[...]}' />

        <div className="stack" style={{marginTop:10}}>
          <div style={{flex:1}}>
            <div className="label">Aspect Ratio</div>
            <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
              {["9:16","16:9","1:1","4:3","3:4"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div style={{width:140}}>
            <div className="label">Duration (s)</div>
            <input className="input" type="number" min="3" max="60" value={duration} onChange={e=>setDuration(Number(e.target.value))}/>
          </div>
          <div style={{width:120}}>
            <div className="label">Count</div>
            <input className="input" type="number" min="1" max="2" value={count} onChange={e=>setCount(Number(e.target.value))}/>
          </div>
        </div>

        <div className="stack" style={{marginTop:12}}>
          <button className="btn" onClick={example}>Example Script</button>
          <button className="btn primary" onClick={run}>Generate (endpoint asal)</button>
        </div>
      </div>

      <div className="card half">
        <div className="label">Nota</div>
        <ul className="mini muted">
          <li>Payload ikut repo asal: <code>{`{ model, aspectRatio, duration, videoCount, prompt }`}</code></li>
          <li>Kalau akaun tak ada akses model tertentu, cuba model lain.</li>
        </ul>
      </div>
    </>
  );
}
