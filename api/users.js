import { getDb } from './_db.js';
import { authUser, signToken, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const isRegister = url.endsWith('/register') || url.includes('/register');
  const isMe = url.endsWith('/me') || url.includes('/me');

  const sql = getDb();

  if (isRegister) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, name, age, occupation } = req.body || {};
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });

    try {
      const rows = await sql`
        INSERT INTO users (email, name, age, occupation)
        VALUES (${email.toLowerCase().trim()}, ${name.trim()}, ${age||null}, ${occupation||null})
        ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, updated_at=NOW()
        RETURNING *`;
      const u = rows[0];
      const token = signToken({ userId: u.id, email: u.email, name: u.name });
      return res.status(200).json({
        token,
        user: { id:u.id, email:u.email, name:u.name, age:u.age, occupation:u.occupation,
                coin_balance:Number(u.coin_balance), base_coins:Number(u.base_coins),
                bonus_coins:Number(u.bonus_coins), joined_at:u.joined_at },
      });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (isMe) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const payload = authUser(req);
    if (!payload) return res.status(401).json({ error: 'Unauthorised' });
    const rows = await sql`SELECT * FROM users WHERE id=${payload.userId}`;
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.status(200).json({
      id:u.id, email:u.email, name:u.name, age:u.age, occupation:u.occupation,
      coin_balance:Number(u.coin_balance), base_coins:Number(u.base_coins),
      bonus_coins:Number(u.bonus_coins), joined_at:u.joined_at,
    });
  }

  return res.status(404).json({ error: 'Not found' });
}
