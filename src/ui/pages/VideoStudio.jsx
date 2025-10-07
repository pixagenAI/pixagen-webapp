import React, { useState } from "react";

export default function VideoStudio({ onLog, onGenerate }){
  const [script, setScript] = useState("");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(8);
  const [count, setCount] = useState(1);
  const [people, setPeople] = useState(false);

  const run = async ()=>{
    try{
      onLog?.({ action:"VIDEO_REQUEST", data:{ script, ratio, duration, count, generatePeople:people }});
      const res = await onGenerate({ script, ratio, durationSecs:duration, numberOfVideos:count, generatePeople:people });
      onLog?.({ action:"VIDEO_RESPONSE", data: res.data });
      alert("Video generated (check Activity Log).");
    }catch(e){ onLog?.({ action:"VIDEO_ERROR", error:e?.message||String(e) }); }
  };

  return (
    <>
      <div className="card half">
        <div className="label">Video Script / Scene JSON</div>
        <textarea value={script} onChange={e=>setScript(e.target.value)} placeholder='{"shots":[...]}' />
        <div className="stack" style={{marginTop:10}}>
          <div style={{flex:1}}>
            <div className="label">Aspect Ratio</div>
            <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
              <option>9:16</option><option>16:9</option><option>1:1</option>
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
          <label className="mini"><input type="checkbox" checked={people} onChange={e=>setPeople(e.target.checked)} /> Generate People</label>
          <button className="btn primary" onClick={run}>Generate Video</button>
        </div>
      </div>

      <div className="card half">
        <div className="label">Nota</div>
        <p className="mini muted">VEO mungkin limit pada akaun tertentu. Pastikan API & quota ok.</p>
      </div>
    </>
  );
}
