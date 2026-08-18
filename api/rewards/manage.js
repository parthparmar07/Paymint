// PATCH /api/rewards/manage — update or delete reward group (founder only)
import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();
  const { action, brand, label, newBrand, newLabel, newCost, active } = req.body || {};

  if (req.method === 'PATCH') {
    if (action === 'toggle') {
      await sql`UPDATE rewards SET active=${!!active} WHERE brand=${brand} AND label=${label} AND stock>0`;
      return res.status(200).json({ ok:true });
    }
    if (action === 'update') {
      await sql`UPDATE rewards SET brand=${newBrand||brand}, label=${newLabel||label},
        cost_coins=${Number(newCost)} WHERE brand=${brand} AND label=${label}`;
      return res.status(200).json({ ok:true });
    }
    if (action === 'delete') {
      await sql`DELETE FROM rewards WHERE brand=${brand} AND label=${label}`;
      return res.status(200).json({ ok:true });
    }
  }
  return res.status(400).json({ error: 'Unknown action' });
}
