import { getDb } from '../_db.js';
import { authUser, isFounder, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sql = getDb();
  if (req.method === 'GET') {
    if (!authUser(req)) return res.status(401).json({ error: 'Unauthorised' });
    const rows = await sql`SELECT brand,label,cost_coins,COUNT(*) FILTER (WHERE active AND stock>0) AS available FROM rewards GROUP BY brand,label,cost_coins HAVING COUNT(*) FILTER (WHERE active AND stock>0)>0 ORDER BY brand,label`;
    return res.status(200).json(rows.map(r=>({brand:r.brand,label:r.label,cost_coins:Number(r.cost_coins),available:Number(r.available)})));
  }
  if (req.method === 'POST') {
    if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
    const { brand, label, cost_coins, codes } = req.body || {};
    if (!brand||!label||!cost_coins||!codes?.length) return res.status(400).json({ error: 'Missing fields' });
    await Promise.all(codes.map(code => sql`INSERT INTO rewards (brand,label,cost_coins,code,stock,active) VALUES (${brand},${label},${Number(cost_coins)},${code.trim()},1,true)`));
    return res.status(201).json({ inserted: codes.length });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
