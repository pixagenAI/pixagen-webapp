import React, { useState } from "react";

export default function Assets({ onLog }){
  const [items, setItems] = useState([]);

  const add = (e)=>{
    const files = Array.from(e.target.files||[]);
    const mapped = files.map(f=>({ name: f.name, type: f.type, size: f.size }));
    setItems(prev=>[...prev, ...mapped]);
    onLog?.({ action:"ASSET_UPLOAD", data: mapped });
  };

  return (
    <div className="card">
      <div className="stack" style={{justifyContent:"space-between", alignItems:"center"}}>
        <div>
          <div className="label">Upload Aset (logo, latar, ikon)</div>
          <input className="input" type="file" multiple onChange={add} accept="image/*"/>
        </div>
        <button className="btn">Open Folder</button>
      </div>

      <table className="table" style={{marginTop:12, width:"100%", borderCollapse:"collapse"}}>
        <thead><tr><th>Nama</th><th>Jenis</th><th>Saiz</th></tr></thead>
        <tbody>
        {items.map((it,idx)=>(
          <tr key={idx}>
            <td>{it.name}</td><td className="muted">{it.type||"-"}</td><td className="muted">{Math.round(it.size/1024)} KB</td>
          </tr>
        ))}
        {items.length===0 && <tr><td colSpan="3" className="muted">Tiada aset.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
