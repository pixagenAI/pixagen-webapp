import React, { useMemo, useState } from "react";
import { analyzeProduct, fusionGenerate, promoGenerateVideo, veoGenerateVideo } from "../../api";

/** Helper convert file -> dataURL */
async function fileToDataURL(file){
  if(!file) return null;
  return new Promise((res,rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function ProductFusion({ onLog }){
  const [step, setStep] = useState(1);

  // Step 1: Product
  const [productFile, setProductFile] = useState(null);
  const [productDataURL, setProductDataURL] = useState(null);
  const [productInsights, setProductInsights] = useState(null);
  const [busy, setBusy] = useState(false);

  // Step 2: Model (person) — optional
  const [modelFile, setModelFile] = useState(null);
  const [modelDataURL, setModelDataURL] = useState(null);

  // Step 3: Results
  const [gallery, setGallery] = useState([]); // up to 5
  const [picked, setPicked] = useState(null);

  // Promo config
  const [brand, setBrand] = useState("Bangpit Foods");
  const [productName, setProductName] = useState("Ayam Gepuk Bangpit");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState(15);
  const [cta, setCta] = useState("Datang ke Taman Suria — 12pm–7pm. Follow @bangpitfoods");

  const canNext1 = !!productFile && !!productInsights;
  const canNext2 = true; // model optional
  const canGenerate = !!productDataURL;

  const uploadProduct = async (e)=>{
    const f = e.target.files?.[0]; if(!f) return;
    setProductFile(f);
    const url = await fileToDataURL(f);
    setProductDataURL(url);
    setProductInsights(null);
  };

  const uploadModel = async (e)=>{
    const f = e.target.files?.[0] || null;
    setModelFile(f);
    const url = f ? await fileToDataURL(f) : null;
    setModelDataURL(url);
  };

  const runAnalyze = async ()=>{
    try{
      setBusy(true);
      onLog?.({ action:"PF_ANALYZE_REQUEST" });
      const res = await analyzeProduct({ imageDataURL: productDataURL });
      setProductInsights(res.data);
      onLog?.({ action:"PF_ANALYZE_RESPONSE", data: res.data });
    }catch(e){
      onLog?.({ action:"PF_ANALYZE_ERROR", error: e?.message || String(e) });
      alert("Gagal analisa produk.");
    }finally{ setBusy(false); }
  };

  const runGenerate = async ()=>{
    try{
      setBusy(true);
      onLog?.({ action:"PF_FUSION_REQUEST", data:{ hasModel: !!modelDataURL }});
      const res = await fusionGenerate({
        productDataURL,
        modelDataURL,
        context: productInsights?.insights || {},
        maxOutputs: 5,
        ratio
      });
      const outs = res?.data?.images || [];
      setGallery(outs.slice(0,5));
      setPicked(null);
      onLog?.({ action:"PF_FUSION_RESPONSE", data:{ count: outs.length }});
      setStep(3);
    }catch(e){
      onLog?.({ action:"PF_FUSION_ERROR", error: e?.message || String(e) });
      alert("Gagal generate komposit.");
    }finally{ setBusy(false); }
  };

  const buildPromoScript = ()=>{
    return {
      meta: { version: 1, brand, productName, ratio, duration, vibe: "fast-cut, appetizing, upbeat" },
      cta,
      shots: [
        { start:0,  duration:3,  instruction:"Hero shot: product big, glossy, specular highlights, quick dolly-in" },
        { start:3,  duration:3,  instruction:"Macro texture close-up, shallow DOF, steam subtle" },
        { start:6,  duration:4,  instruction:"Model holding product, smiling, hand movement, parallax background" },
        { start:10, duration:5,  instruction:"CTA + price + location overlay; upbeat music, quick cuts" }
      ],
      overlays: [
        { type:"text", when: 0.5, text: productName, style:"bold, glowing outline, top-left" },
        { type:"text", when: 11,  text: cta,        style:"semi bold, bottom center" }
      ],
      // we pass chosen image as reference
      referenceImage: picked
    };
  };

  const makePromo = async ()=>{
    if(!picked) return alert("Pilih satu gambar dahulu.");
    try{
      setBusy(true);
      onLog?.({ action:"PF_PROMO_BUILD" });
      const script = buildPromoScript();
      // optional: save script preview
      const res = await promoGenerateVideo(script);
      onLog?.({ action:"PF_PROMO_SCRIPT_RESPONSE", data: res.data });

      const res2 = await veoGenerateVideo({
        script: res?.data?.script || script,
        ratio,
        durationSecs: duration,
        numberOfVideos: 1,
        generatePeople: true, // allow people for TikTok style
        modelId: "veo-3.0"
      });
      onLog?.({ action:"PF_PROMO_VIDEO_RESPONSE", data: res2.data });
      alert("Promo video request dihantar. Rujuk Activity Log.");
    }catch(e){
      onLog?.({ action:"PF_PROMO_ERROR", error: e?.message || String(e) });
      alert("Gagal jana promo video.");
    }finally{ setBusy(false); }
  };

  const Stepper = useMemo(()=>(
    <div className="card" style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      {["Produk","Model","Hasil"].map((t,i)=>(
        <div key={t} className="chip" style={{
          background: step===i+1 ? "linear-gradient(135deg,#2f6df6,#6ae3ff)" : "#0c111a",
          color: step===i+1 ? "#05101a" : "#b9c3da",
          border: step===i+1 ? "none" : "1px solid #253049",
          fontWeight: step===i+1 ? 800 : 600
        }}>{i+1}. {t}</div>
      ))}
    </div>
  ),[step]);

  return (
    <>
      {Stepper}

      {/* STEP 1: PRODUCT */}
      {step===1 && (
        <>
          <div className="card half">
            <h3 style={{marginTop:0}}>1) Upload Produk</h3>
            <input className="input" type="file" accept="image/*" onChange={uploadProduct}/>
            {productDataURL && (
              <>
                <div className="label" style={{marginTop:10}}>Preview</div>
                <img src={productDataURL} alt="product" style={{width:"100%",borderRadius:12,border:"1px solid #1e2330"}}/>
              </>
            )}
            <div className="stack" style={{marginTop:12}}>
              <button className="btn" onClick={()=>setProductFile(null)}>Clear</button>
              <button className="btn primary" disabled={!productDataURL || busy} onClick={runAnalyze}>
                {busy? "Analyzing..." : "Analyze Product"}
              </button>
            </div>
          </div>

          <div className="card half">
            <div className="label">Hasil Analisa</div>
            {productInsights ? (
              <pre className="log" style={{maxHeight:280}}>{JSON.stringify(productInsights,null,2)}</pre>
            ) : (
              <div className="muted mini">AI akan keluarkan kategori, warna dominan, cadangan latar, angle, dsb.</div>
            )}
            <div className="stack" style={{marginTop:12}}>
              <button className="btn primary" disabled={!canNext1} onClick={()=>setStep(2)}>Next: Model</button>
            </div>
          </div>
        </>
      )}

      {/* STEP 2: MODEL */}
      {step===2 && (
        <>
          <div className="card half">
            <h3 style={{marginTop:0}}>2) Upload Model (Opsyenal)</h3>
            <input className="input" type="file" accept="image/*" onChange={uploadModel}/>
            {modelDataURL ? (
              <>
                <div className="label" style={{marginTop:10}}>Preview</div>
                <img src={modelDataURL} alt="model" style={{width:"100%",borderRadius:12,border:"1px solid #1e2330"}}/>
              </>
            ) : (
              <div className="muted mini">Boleh skip — AI akan generate scene tanpa model jika kosong.</div>
            )}
            <div className="stack" style={{marginTop:12}}>
              <button className="btn" onClick={()=>setStep(1)}>Back</button>
              <button className="btn primary" disabled={!canNext2 || busy} onClick={runGenerate}>
                {busy? "Generating..." : "Generate (max 5)"}
              </button>
            </div>
          </div>

          <div className="card half">
            <div className="label">Tetapan ringkas</div>
            <div className="stack">
              <div style={{flex:1}}>
                <div className="label">Aspect Ratio</div>
                <select className="input" value={ratio} onChange={e=>setRatio(e.target.value)}>
                  <option>9:16</option><option>16:9</option><option>1:1</option><option>3:4</option><option>4:3</option>
                </select>
              </div>
              <div style={{flex:1}}>
                <div className="label">Nama Produk</div>
                <input className="input" value={productName} onChange={e=>setProductName(e.target.value)} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* STEP 3: RESULTS */}
      {step===3 && (
        <>
          <div className="card">
            <h3 style={{marginTop:0}}>3) Pilih Hasil (tap salah satu)</h3>
            {gallery?.length ? (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
                {gallery.map((img,idx)=>(
                  <div key={idx}
                       onClick={()=>setPicked(img)}
                       style={{
                         borderRadius:12, overflow:"hidden", cursor:"pointer",
                         outline: picked===img ? "3px solid #6ae3ff" : "1px solid #1e2330"
                       }}>
                    <img src={img} alt={`opt-${idx}`} style={{width:"100%",display:"block"}}/>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">Tiada hasil lagi. Balik ke Step 2 dan tekan Generate.</div>
            )}
            <div className="stack" style={{marginTop:12}}>
              <button className="btn" onClick={()=>setStep(2)}>Back</button>
              <button className="btn primary" disabled={!picked || busy} onClick={makePromo}>
                {busy? "Building..." : "Generate Promo Video"}
              </button>
            </div>
          </div>

          <div className="card half">
            <div className="label">Brand</div>
            <input className="input" value={brand} onChange={e=>setBrand(e.target.value)} />
            <div className="label" style={{marginTop:10}}>CTA</div>
            <input className="input" value={cta} onChange={e=>setCta(e.target.value)} />
          </div>

          <div className="card half">
            <div className="label">Durasi (s)</div>
            <input className="input" type="number" min="6" max="60" value={duration} onChange={e=>setDuration(Number(e.target.value))}/>
          </div>
        </>
      )}
    </>
  );
}
