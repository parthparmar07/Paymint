import { getDb } from './_db.js';
import { authUser, isFounder, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const isClaim = url.endsWith('/claim') || url.includes('/claim');
  const isManage = url.endsWith('/manage') || url.includes('/manage');

  const sql = getDb();

  // 1. Claim Reward Code (POST /api/rewards/claim)
  if (isClaim) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const payload = authUser(req);
    if (!payload) return res.status(401).json({ error: 'Unauthorised' });
    const { brand, label } = req.body || {};
    if (!brand || !label) return res.status(400).json({ error: 'brand and label required' });

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

  // 2. Manage Reward Group (PATCH /api/rewards/manage - Founder Only)
  if (isManage) {
    if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
    if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
    const { action, brand, label, newBrand, newLabel, newCost, active } = req.body || {};

    try {
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
      return res.status(400).json({ error: 'Unknown action' });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. Get / Add Rewards (GET or POST /api/rewards)
  if (req.method === 'GET') {
    if (!authUser(req)) return res.status(401).json({ error: 'Unauthorised' });
    const rows = await sql`
      SELECT brand, label, cost_coins,
        COUNT(*) FILTER (WHERE active AND stock>0) AS available
      FROM rewards GROUP BY brand,label,cost_coins
      HAVING COUNT(*) FILTER (WHERE active AND stock>0) > 0
      ORDER BY brand,label`;
    return res.status(200).json(rows.map(r=>({
      brand:r.brand, label:r.label,
      cost_coins:Number(r.cost_coins), available:Number(r.available),
    })));
  }

  if (req.method === 'POST') {
    if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
    const { brand, label, cost_coins, codes } = req.body || {};
    if (!brand || !label || !cost_coins || !codes?.length) return res.status(400).json({ error: 'Missing fields' });
    const inserted = await Promise.all(codes.map(code => sql`
      INSERT INTO rewards (brand,label,cost_coins,code,stock,active)
      VALUES (${brand},${label},${Number(cost_coins)},${code.trim()},1,true)
      RETURNING id`));
    return res.status(201).json({ inserted: inserted.length });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
