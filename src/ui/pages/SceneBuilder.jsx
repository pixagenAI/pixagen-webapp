import React, { useState } from "react";

export default function SceneBuilder({ onLog }){
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState("");

  const onFile = (e)=> setFiles(Array.from(e.target.files || []));

  const run = () => {
    onLog?.({ action:"SCENE_BUILDER", data:{ files: files.map(f=>f.name), prompt }});
    alert("Scene builder WIP (hook Imagen Edit)");
  };

  return (
    <>
      <div className="card half">
        <div className="label">Upload Images (max 10)</div>
        <input className="input" type="file" multiple accept="image/*" onChange={onFile}/>
        <div className="label" style={{marginTop:10}}>Edit Prompt</div>
        <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="cinematic lighting, remove background..." />
        <div className="stack" style={{marginTop:12}}>
          <button className="btn">Add Step</button>
          <button className="btn">Undo</button>
          <button className="btn">Reset</button>
          <button className="btn primary" onClick={run}>Process</button>
        </div>
      </div>

      <div className="card half">
        <div className="label">Preview</div>
        <div className="muted mini">Hasil akan dipaparkan di sini (WIP).</div>
      </div>
    </>
  );
}
