import React, { useState } from "react";

const VEO_MODELS = [
  { id: "veo-3.0", label: "VEO 3.0 (Standard)" },
  { id: "veo-3.0-lite", label: "VEO 3.0 Lite (cepat & murah)" },
  { id: "veo-3.0-pro", label: "VEO 3.0 Pro (kualiti tinggi)" }
];

const RATIOS = ["9:16", "16:9", "1:1", "4:3", "3:4"];

export default function VideoStudio({ onLog, onGenerate }){
  const [script, setScript] = useState("");
  const [veoModel, setVeoModel] = useState(VEO_MODELS[0].id);
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [count, setCount] = useState(1);
  const [people, setPeople] = useState(false);

  const example = () => {
    const sample = {
      shots: [
        { start: 0, duration: 3, instruction: "Hero shot product on table, cinematic lighting" },
        { start: 3, duration: 3, instruction: "Macro texture close-up, shallow DOF" },
        { start: 6, duration: 2, instruction: "Logo + CTA overlay, upbeat music" }
      ],
      overlays: [{ type: "text", when: 6.2, text: "Order Now", style: "bold, center-bottom" }]
    };
    setScript(JSON.stringify(sample, null, 2));
  };

  const run = async ()=>{
    try{
      const payload = {
        script: safeScript(script),
        modelId: veoModel,
        ratio,
        durationSecs: duration,
        numberOfVideos: count,
        generatePeople: people
      };
      onLog?.({ action:"VIDEO_REQUEST", data: payload });
      const res = await onGenerate(payload);
      onLog?.({ action:"VIDEO_RESPONSE", data: res.data });
      alert("Video request sent. Check Activity Log.");
    }catch(e){
      onLog?.({ action:"VIDEO_ERROR", error: e?.message || String(e) });
      alert("Video generation failed.");
    }
  };

  return (
    <>
      <div className="card half">
        <div className="label">VEO Model</div>
        <select className="input" value={veoModel} onChange={(e)=>setVeoModel(e.target.value)}>
          {VEO_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        <div className="label" style={{marginTop:10}}>Video Script / Scene JSON</div>
        <textarea value={script} onChange={e=>setScript(e.target.value)} placeholder='{"shots":[...], "overlays":[...]}' />

        <div className="stack" style={{marginTop:10}}>
          <div style={{flex:1}}>
            <div className="label">Aspect Ratio</div>
            <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
              {RATIOS.map(r => <option key={r}>{r}</option>)}
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

        <div className="stack" style={{marginTop:12, alignItems:"center"}}>
          <label className="mini"><input type="checkbox" checked={people} onChange={e=>setPeople(e.target.checked)} /> Allow People</label>
          <button className="btn" onClick={example}>Example Script</button>
          <button className="btn primary" onClick={run}>Generate Video</button>
        </div>
      </div>

      <div className="card half">
        <div className="label">Nota</div>
        <ul className="mini muted">
          <li>Tak semua akaun AI Studio ada akses setiap model. Jika 403/404, cuba model lain.</li>
          <li>Shot plan ringkas (3–5 shot) biasanya lebih stabil.</li>
        </ul>
      </div>
    </>
  );
}

function safeScript(str){
  try{
    const j = JSON.parse(str);
    return j;
  }catch{
    return { prompt: str }; // fallback: hantar sebagai teks bebas
  }
}
