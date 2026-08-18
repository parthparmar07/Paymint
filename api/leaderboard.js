import { getDb } from './_db.js';
import { setCorsHeaders, authUser } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!authUser(req)) return res.status(401).json({ error: 'Unauthorised' });
  const sql = getDb();
  const rows = await sql`
    SELECT id, name, occupation, coin_balance
    FROM users ORDER BY coin_balance DESC LIMIT 50`;
  return res.status(200).json(rows.map(u=>({
    id:u.id, name:u.name, occupation:u.occupation, coin_balance:Number(u.coin_balance),
  })));
}
