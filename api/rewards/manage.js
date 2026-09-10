import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const { action, brand, label, newBrand, newLabel, newCost, active } = req.body || {};
  try {
    const sql = getDb();
    if (action==='toggle') await sql`UPDATE rewards SET active=${!!active} WHERE brand=${brand} AND label=${label} AND stock>0`;
    else if (action==='update') await sql`UPDATE rewards SET brand=${newBrand||brand},label=${newLabel||label},cost_coins=${Number(newCost)} WHERE brand=${brand} AND label=${label}`;
    else if (action==='delete') await sql`DELETE FROM rewards WHERE brand=${brand} AND label=${label}`;
    else return res.status(400).json({ error: 'Unknown action' });
    return res.status(200).json({ ok: true });
  } catch(err) {
    console.error('[/api/rewards/manage]', err.message);
    return res.status(500).json({ error: 'Failed to update reward' });
  }
}
