export default function handler(req, res) {
  return res.status(200).json({ ok: true, service: "pixagen-vercel", time: new Date().toISOString() });
}
