import { getDb } from '../_db.js';
import { authUser, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  const payload = authUser(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorised' });
  const { transactionId, note } = req.body || {};
  if (!transactionId || !note?.trim()) return res.status(400).json({ error: 'transactionId and note required' });
  const sql = getDb();
  try {
    const txRows = await sql`
      SELECT * FROM transactions WHERE id=${transactionId} AND user_id=${payload.userId}`;
    if (!txRows.length) return res.status(404).json({ error: 'Transaction not found' });
    const tx = txRows[0];

    if (tx.bonus_claimed) {
      await sql`UPDATE transactions SET purchase_note=${note.trim()} WHERE id=${transactionId}`;
      return res.status(200).json({ bonus_awarded:false, bonus_coins:0, reason:'Already claimed' });
    }

    // 1-hour window — backend enforced
    const ageMin = (Date.now() - new Date(tx.created_at).getTime()) / 60000;
    const eligible = ageMin <= 60;
    // 5% of original amount — backend calculates
    const bonus = eligible ? parseFloat((Number(tx.amount)*0.05).toFixed(1)) : 0;

    await sql`
      UPDATE transactions
      SET purchase_note=${note.trim()}, bonus_coins=${bonus},
          total_coins=base_coins+${bonus}, bonus_claimed=${eligible}
      WHERE id=${transactionId}`;

    if (eligible && bonus > 0) {
      await sql`
        UPDATE users
        SET coin_balance=coin_balance+${bonus}, bonus_coins=bonus_coins+${bonus}, updated_at=NOW()
        WHERE id=${payload.userId}`;
    }

    const uRows = await sql`SELECT coin_balance,base_coins,bonus_coins FROM users WHERE id=${payload.userId}`;
    return res.status(200).json({
      bonus_awarded:     eligible && bonus > 0,
      bonus_coins:       bonus,
      coin_balance:      Number(uRows[0].coin_balance),
      base_coins:        Number(uRows[0].base_coins),
      bonus_coins_total: Number(uRows[0].bonus_coins),
    });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
