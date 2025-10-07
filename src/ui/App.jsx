import React, { useMemo, useState } from "react";
import { ping, geminiGenerate, veoGenerateVideo } from "../api";

import ImageStudio from "./pages/ImageStudio.jsx";
import VideoStudio from "./pages/VideoStudio.jsx";
import SceneBuilder from "./pages/SceneBuilder.jsx";
import ProductFusion from "./pages/ProductFusion.jsx";
import PromptLab from "./pages/PromptLab.jsx";
import Assets from "./pages/Assets.jsx";
import ActivityLog from "./pages/ActivityLog.jsx";
import Settings from "./pages/Settings.jsx";

const NAV = [
  { key: "create", title: "Create", items: [
    { id: "image-studio", label: "Image Studio", icon: "🖼️" },
    { id: "video-studio", label: "Video Studio", icon: "🎬" }
  ]},
  { key: "build", title: "Build", items: [
    { id: "scene-builder", label: "Scene Builder", icon: "🧱" },
    { id: "product-fusion", label: "Product Fusion", icon: "🧩" }
  ]},
  { key: "tools", title: "Tools", items: [
    { id: "prompt-lab", label: "Prompt Lab", icon: "🧪" },
    { id: "assets", label: "Assets", icon: "📦" }
  ]},
  { key: "system", title: "System", items: [
    { id: "settings", label: "Settings", icon: "⚙️" },
    { id: "activity-log", label: "Activity Log", icon: "📜" }
  ]}
];

export default function App(){
  const [route, setRoute] = useState("settings");
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState([]);
  const [navOpen, setNavOpen] = useState(false);

  const addLog = (entry) => setLogs(prev => [{ time: new Date().toLocaleString(), ...entry }, ...prev]);

  const handleHealth = async () => {
    try{ const res = await ping(); addLog({ action:"PING", data: res.data }); }
    catch(e){ addLog({ action:"PING_ERROR", error: e?.message || String(e) }); }
  };

  const CurrentPage = useMemo(() => {
    switch(route){
      case "image-studio": return <ImageStudio onLog={addLog} onGenerate={geminiGenerate}/>;
      case "video-studio": return <VideoStudio onLog={addLog} onGenerate={veoGenerateVideo}/>;
      case "scene-builder": return <SceneBuilder onLog={addLog}/>;
      case "product-fusion": return <ProductFusion onLog={addLog}/>;
      case "prompt-lab": return <PromptLab onLog={addLog} onGemini={geminiGenerate}/>;
      case "assets": return <Assets onLog={addLog}/>;
      case "settings": return <Settings onLog={addLog}/>;
      case "activity-log": return <ActivityLog logs={logs}/>;
      default: return <div className="card">Halaman tidak ditemui.</div>;
    }
  }, [route, logs]);

  return (
    <div className="app">
      {/* overlay for mobile */}
      <div className={`overlay ${navOpen ? "show":""}`} onClick={()=>setNavOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${navOpen ? "show":""}`}>
        <div className="brand">
          <div className="brand-badge"></div>
          <h1>PixaGen Studio</h1>
        </div>

        {NAV.map(section => (
          <div className="nav-section" key={section.key}>
            <div className="nav-title">{section.title}</div>
            {section.items.map(item => (
              <button
                key={item.id}
                className={`nav-btn ${route===item.id ? "active":""}`}
                onClick={()=>{ setRoute(item.id); setNavOpen(false); }}
              >
                <span style={{marginRight:2}}>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        ))}

        <div style={{marginTop:14}} className="mini muted">
          © {new Date().getFullYear()} PixaGen — Made with ❤️
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="left">
            <button className="menu-btn" onClick={()=>setNavOpen(v=>!v)}>☰</button>
            <span className="chip">UI v2.3</span>
            <span className="chip">API 3001</span>
            <button className="btn" onClick={handleHealth}>Health</button>
          </div>

          <div className="search">
            <input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Cari setting / tools / aset..." />
          </div>

          <div className="stack">
            <button className="btn">EN</button>
            <button className="btn">Dark</button>
          </div>
        </div>

        <div className="content">
          <div className="cards">
            <div className="card hero">
              <div className="stack" style={{justifyContent:"space-between", alignItems:"center"}}>
                <div>
                  <div className="muted mini">Dashboard</div>
                  <h2 style={{margin:"6px 0 0", lineHeight:1.15}}>Selamat datang ke PixaGen Studio</h2>
                  <p className="muted" style={{marginTop:6}}>
                    Masukkan <b>Google AI Studio API Key</b> di <b>Settings</b>.  
                    Semua model (Gemini/Imagen/VEO) guna key yang sama.
                  </p>
                </div>
                <div className="stack">
                  <span className="chip">Sidebar</span>
                  <span className="chip">Serverless-ready</span>
                </div>
              </div>
            </div>

            {CurrentPage}
          </div>
        </div>
      </main>
    </div>
  );
}
