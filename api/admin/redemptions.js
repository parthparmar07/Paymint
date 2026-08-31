import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();
  const rows = await sql`SELECT r.*,u.name AS user_name,u.occupation FROM reward_redemptions r JOIN users u ON u.id=r.user_id ORDER BY r.redeemed_at DESC`;
  return res.status(200).json(rows.map(r=>({id:r.id,user_name:r.user_name,user_email:r.user_email,occupation:r.occupation,brand:r.brand,label:r.label,code:r.code,coins_spent:Number(r.coins_spent),redeemed_at:r.redeemed_at})));
}
