import { getDb } from '../_db.js';
import { signToken, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, name, age, occupation } = req.body || {};
  if (!email || !name) return res.status(400).json({ error: 'email and name required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email' });
  const sql = getDb();
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
