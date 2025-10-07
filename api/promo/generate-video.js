export default async function handler(req, res) {
  try {
    const { productName, brand, ratio, duration, vibe, cta, shots = [], overlays = [] } = req.body || {};
    const sceneJson = { meta: { version: 1, brand, productName, ratio, duration, vibe }, cta, shots, overlays };
    return res.status(200).json({ status:"ok", script: sceneJson });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Promo montage failed" });
  }
}
