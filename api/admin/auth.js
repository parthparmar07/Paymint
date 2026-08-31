import { setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body||{};
  const valid = (process.env.FOUNDER_PASSWORD||'BK11').split(',');
  if (!valid.includes((password||'').trim())) return res.status(401).json({ error: 'Invalid password' });
  return res.status(200).json({ ok: true });
}
