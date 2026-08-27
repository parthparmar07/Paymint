import { getDb } from '../_db.js';
import { authUser, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const payload = authUser(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorised' });
  const sql = getDb();
  const rows = await sql`SELECT * FROM users WHERE id=${payload.userId}`;
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  return res.status(200).json({id:u.id,email:u.email,name:u.name,age:u.age,occupation:u.occupation,coin_balance:Number(u.coin_balance),base_coins:Number(u.base_coins),bonus_coins:Number(u.bonus_coins),joined_at:u.joined_at});
}
