import { getDb } from '../_db.js';
import { authUser, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const payload = authUser(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorised' });
  const { brand, label } = req.body || {};
  if (!brand||!label) return res.status(400).json({ error: 'brand and label required' });
  const sql = getDb();
  try {
    const costRows = await sql`
      SELECT cost_coins FROM rewards
      WHERE brand=${brand} AND label=${label} AND active=true AND stock>0 LIMIT 1`;
    if (!costRows.length) return res.status(404).json({ error: 'Reward not available' });
    const cost = Number(costRows[0].cost_coins);

    const userRows = await sql`SELECT coin_balance FROM users WHERE id=${payload.userId}`;
    if (Number(userRows[0].coin_balance) < cost)
      return res.status(400).json({ error:`Insufficient coins. Need ${cost}, have ${userRows[0].coin_balance}` });

    const codeRows = await sql`
      UPDATE rewards SET stock=0, active=false
      WHERE id=(SELECT id FROM rewards WHERE brand=${brand} AND label=${label}
                AND active=true AND stock>0 ORDER BY created_at ASC LIMIT 1)
      RETURNING code`;
    if (!codeRows.length) return res.status(409).json({ error: 'Out of stock' });

    await sql`UPDATE users SET coin_balance=coin_balance-${cost}, updated_at=NOW() WHERE id=${payload.userId}`;
    await sql`
      INSERT INTO reward_redemptions (user_id,user_email,brand,label,code,coins_spent)
      VALUES (${payload.userId},${payload.email},${brand},${label},${codeRows[0].code},${cost})`;

    const fresh = await sql`SELECT coin_balance FROM users WHERE id=${payload.userId}`;
    return res.status(200).json({
      code: codeRows[0].code, coins_spent:cost, coin_balance:Number(fresh[0].coin_balance),
    });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
