import React, { useState } from "react";
import { promoGenerateVideo, veoGenerateVideo } from "../../api";

export default function ProductFusion({ onLog }){
  const [product, setProduct] = useState(null);
  const [scene, setScene] = useState(null);
  const [pos, setPos] = useState({x:50,y:50});
  const [activeTab, setActiveTab] = useState("composite");
  const [compositeReady, setCompositeReady] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [brand, setBrand] = useState("Bangpit Foods");
  const [productName, setProductName] = useState("Ayam Gepuk Bangpit");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(20);
  const [vibe, setVibe] = useState("fast-cut, appetizing, street-food vibe, upbeat music");
  const [cta, setCta] = useState("Datang ke Taman Suria (berdekatan Surau Kayu) — buka 12pm–7pm. Follow TikTok @bangpitfoods");

  const onImg = (setter) => (e)=> setter(e.target.files?.[0] ?? null);
  const onClickCanvas = (e)=>{
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left)/rect.width)*100;
    const y = ((e.clientY - rect.top)/rect.height)*100;
    setPos({x: Math.round(x), y: Math.round(y)});
  };

  // Stub composite preview (gantikan dengan AI sebenar bila ready)
  const generateComposite = ()=>{
    onLog?.({ action:"PRODUCT_FUSION_REQUEST", data:{ product: product?.name, scene: scene?.name, dropPosition: pos }});
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const g = ctx.createLinearGradient(0,0,1024,1024);
    g.addColorStop(0, "#0b0f15"); g.addColorStop(1, "#1b2130");
    ctx.fillStyle = g; ctx.fillRect(0,0,1024,1024);
    ctx.fillStyle = "#6ae3ff";
    ctx.beginPath(); ctx.arc((pos.x/100)*1024, (pos.y/100)*1024, 14, 0, Math.PI*2); ctx.fill();
    const url = canvas.toDataURL("image/png");
    setPreviewUrl(url);
    setCompositeReady(true);
    setActiveTab("promo");
    onLog?.({ action:"PRODUCT_FUSION_RESPONSE", data:{ previewUrl: "[data-url]", pos }});
  };

  const SHOT_PRESET = [
    { t: 0,  len: 3,  desc: "Hero shot: produk besar, lighting dramatik, steam subtle" },
    { t: 3,  len: 3,  desc: "Close-up tekstur (macro, shallow DOF)" },
    { t: 6,  len: 4,  desc: "Scene kedai: tangan serve di meja" },
    { t: 10, len: 4,  desc: "B-roll: parallax, highlight logo & harga" },
    { t: 14, len: 4,  desc: "CTA: lokasi + waktu + QR code" }
  ];

  const buildMontagePayload = ()=>({
    brand, productName, ratio, duration, vibe, cta,
    shots: SHOT_PRESET.map(s => ({ start: s.t, duration: s.len, instruction: s.desc })),
    overlays: [
      { type: "text", when: 1,  text: productName, style: "bold, glowing outline" },
      { type: "text", when: 12, text: cta,        style: "semi bold, bottom center" }
    ]
  });

  const generatePromoScript = async ()=>{
    const payload = buildMontagePayload();
    onLog?.({ action:"PROMO_SCRIPT_REQUEST", data: payload });
    const res = await promoGenerateVideo(payload);
    onLog?.({ action:"PROMO_SCRIPT_RESPONSE", data: res.data });
    return res?.data?.script;
  };

  const generatePromoVideo = async ()=>{
    try{
      const script = await generatePromoScript();
      const res = await veoGenerateVideo({ script, ratio, durationSecs: duration, numberOfVideos: 1, generatePeople: false });
      onLog?.({ action:"PROMO_VIDEO_RESPONSE", data: res.data });
      alert("Promo video request dihantar. Rujuk Activity Log.");
    }catch(e){
      onLog?.({ action:"PROMO_VIDEO_ERROR", error: e?.message || String(e) });
      alert("Gagal jana promo video.");
    }
  };

  return (
    <>
      <div className="card">
        <div className="stack" style={{alignItems:"center", justifyContent:"space-between"}}>
          <div className="stack">
            <button className={`btn ${activeTab==="composite"?"primary":""}`} onClick={()=>setActiveTab("composite")}>Composite</button>
            <button className={`btn ${activeTab==="promo"?"primary":""}`} onClick={()=>setActiveTab("promo")} disabled={!compositeReady}>Promo Video</button>
          </div>
          <span className="pill">Drop: {pos.x}% , {pos.y}%</span>
        </div>
      </div>

      {activeTab==="composite" && (
        <>
          <div className="card half">
            <div className="grid cols-2">
              <div>
                <div className="label">Product</div>
                <input className="input" type="file" accept="image/*" onChange={onImg(setProduct)}/>
              </div>
              <div>
                <div className="label">Scene</div>
                <input className="input" type="file" accept="image/*" onChange={onImg(setScene)}/>
              </div>
            </div>
            <div className="label" style={{marginTop:10}}>Drop Position</div>
            <div style={{height:260,background:"#0b0f15",border:"1px solid #1e2330",borderRadius:12,position:"relative"}}
                onClick={onClickCanvas}>
              <div style={{position:"absolute",left:`calc(${pos.x}% - 6px)`,top:`calc(${pos.y}% - 6px)`,width:12,height:12,borderRadius:12,background:"#6ae3ff",boxShadow:"0 0 12px rgba(106,227,255,.6)"}}/>
            </div>
            <div className="stack" style={{marginTop:12}}>
              <button className="btn">Undo</button>
              <button className="btn">Redo</button>
              <button className="btn primary" onClick={generateComposite} disabled={!product || !scene}>Generate Composite</button>
            </div>
          </div>

          <div className="card half">
            <div className="label">Preview</div>
            {previewUrl ? (
              <img src={previewUrl} alt="composite-preview" style={{width:"100%",borderRadius:12,border:"1px solid #1e2330"}}/>
            ) : (
              <div className="muted mini">Hasil komposit akan muncul di sini.</div>
            )}
            <div className="mini muted" style={{marginTop:8}}>*Bila API sebenar disambung, imej ini akan jadi hasil AI yang match lighting & shadow.</div>
          </div>
        </>
      )}

      {activeTab==="promo" && (
        <>
          <div className="card half">
            <div className="label">Brand</div>
            <input className="input" value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Bangpit Foods" />

            <div className="label" style={{marginTop:10}}>Product Name</div>
            <input className="input" value={productName} onChange={e=>setProductName(e.target.value)} placeholder="Ayam Gepuk Bangpit" />

            <div className="stack" style={{marginTop:10}}>
              <div style={{flex:1}}>
                <div className="label">Aspect Ratio</div>
                <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
                  <option>9:16</option><option>16:9</option><option>1:1</option>
                </select>
              </div>
              <div style={{width:140}}>
                <div className="label">Duration (s)</div>
                <input className="input" type="number" min="6" max="60" value={duration} onChange={e=>setDuration(Number(e.target.value))}/>
              </div>
            </div>

            <div className="label" style={{marginTop:10}}>Vibe / Style</div>
            <input className="input" value={vibe} onChange={e=>setVibe(e.target.value)} placeholder="fast-cut, appetizing, street-food vibe, upbeat music" />

            <div className="label" style={{marginTop:10}}>CTA</div>
            <textarea value={cta} onChange={e=>setCta(e.target.value)} placeholder="Lokasi, waktu, QR/link, handle TikTok" />

            <div className="stack" style={{marginTop:12}}>
              <button className="btn" onClick={generatePromoScript}>Build Script (JSON)</button>
              <button className="btn primary" onClick={generatePromoVideo}>Generate Promo Video</button>
            </div>
          </div>

          <div className="card half">
            <div className="label">Shot Plan (Auto)</div>
            <ul className="mini">
              <li>0–3s: Hero shot produk (glow, steam/smoke subtle)</li>
              <li>3–6s: Macro tekstur (crispy/juicy)</li>
              <li>6–10s: Suasana kedai / tangan serve</li>
              <li>10–14s: B-roll parallax + harga/logo</li>
              <li>14–{duration}s: CTA + lokasi + jam operasi</li>
            </ul>
            {previewUrl && (
              <>
                <div className="label" style={{marginTop:10}}>Reference Composite</div>
                <img src={previewUrl} alt="ref" style={{width:"100%",borderRadius:12,border:"1px solid #1e2330"}}/>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
