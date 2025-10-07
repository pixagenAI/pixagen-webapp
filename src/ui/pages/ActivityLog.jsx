import React from "react";

export default function ActivityLog({ logs=[] }){
  return (
    <div className="card">
      <div className="label">Activity</div>
      <div className="grid">
        {logs.map((l,idx)=>(
          <div key={idx} className="log">
            <div className="mini muted">{l.time}</div>
            <div style={{fontWeight:700}}>{l.action}</div>
            {l.data && <pre>{JSON.stringify(l.data,null,2)}</pre>}
            {l.error && <pre style={{color:"#ff9f9f"}}>{JSON.stringify(l.error,null,2)}</pre>}
          </div>
        ))}
        {logs.length===0 && <div className="muted mini">Belum ada log.</div>}
      </div>
    </div>
  );
}
