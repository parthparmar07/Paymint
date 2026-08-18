import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();

  if (req.method === 'GET') {
    const users = await sql`
      SELECT u.id,u.email,u.name,u.age,u.occupation,
             u.coin_balance,u.base_coins,u.bonus_coins,u.joined_at,
             COUNT(t.id) AS tx_count,
             COALESCE(SUM(t.amount),0) AS total_spent,
             COALESCE(SUM(t.base_coins),0) AS total_base_coins,
             COALESCE(SUM(t.bonus_coins),0) AS total_bonus_coins,
             COALESCE(SUM(t.total_coins),0) AS total_coins_earned,
             COUNT(CASE WHEN t.purchase_note IS NOT NULL THEN 1 END) AS purchase_submissions,
             MAX(t.created_at) AS last_transaction_at
      FROM users u LEFT JOIN transactions t ON t.user_id=u.id
      GROUP BY u.id ORDER BY total_spent DESC NULLS LAST`;

    const txs = await sql`SELECT * FROM transactions ORDER BY created_at DESC`;
    const byUser = {};
    for (const tx of txs) {
      if (!byUser[tx.user_id]) byUser[tx.user_id] = [];
      byUser[tx.user_id].push({
        id:tx.id, merchant:tx.merchant, amount:Number(tx.amount),
        base_coins:Number(tx.base_coins), bonus_coins:Number(tx.bonus_coins),
        total_coins:Number(tx.total_coins), coins:Number(tx.total_coins),
        txn_id:tx.txn_id, txn_date:tx.txn_date, txn_time:tx.txn_time,
        payment_app:tx.payment_app, bank:tx.bank,
        screenshot_url:tx.screenshot_url, purchase_note:tx.purchase_note,
        bonus_claimed:tx.bonus_claimed, created_at:tx.created_at,
      });
    }

    return res.status(200).json(users.map(u=>({
      id:u.id, email:u.email, name:u.name, age:u.age, occupation:u.occupation,
      coin_balance:Number(u.coin_balance), base_coins:Number(u.base_coins),
      bonus_coins:Number(u.bonus_coins), joined_at:u.joined_at,
      tx_count:Number(u.tx_count), total_spent:Number(u.total_spent),
      total_base_coins:Number(u.total_base_coins),
      total_bonus_coins:Number(u.total_bonus_coins),
      total_coins_earned:Number(u.total_coins_earned),
      purchase_submissions:Number(u.purchase_submissions),
      last_transaction_at:u.last_transaction_at,
      transactions:byUser[u.id]||[],
    })));
  }

  if (req.method === 'PATCH') {
    const { action, userId, is_banned, is_demo, name, age, occupation } = req.body||{};
    if (action==='ban')  await sql`UPDATE users SET is_banned=${!!is_banned}  WHERE id=${userId}`;
    if (action==='demo') await sql`UPDATE users SET is_demo=${!!is_demo}      WHERE id=${userId}`;
    if (action==='edit') await sql`UPDATE users SET name=${name},age=${age||null},occupation=${occupation||null},updated_at=NOW() WHERE id=${userId}`;
    return res.status(200).json({ ok:true });
  }

  if (req.method === 'DELETE') {
    const { userId } = req.body||{};
    await sql`DELETE FROM users WHERE id=${userId}`;
    return res.status(200).json({ ok:true });
  }

  return res.status(405).json({ error:'Method not allowed' });
}
