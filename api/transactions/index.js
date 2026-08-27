import { getDb } from '../_db.js';
import { authUser, setCorsHeaders } from '../_auth.js';
function fmt(t){return{id:t.id,merchant:t.merchant,amount:Number(t.amount),base_coins:Number(t.base_coins),bonus_coins:Number(t.bonus_coins),total_coins:Number(t.total_coins),coins:Number(t.total_coins),txn_id:t.txn_id,txn_date:t.txn_date,txn_time:t.txn_time,payment_app:t.payment_app,bank:t.bank,screenshot_url:t.screenshot_url,purchase_note:t.purchase_note,bonus_claimed:t.bonus_claimed,verified:t.verified,created_at:t.created_at};}
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const payload = authUser(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorised' });
  const sql = getDb();
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM transactions WHERE user_id=${payload.userId} ORDER BY created_at DESC LIMIT 100`;
    return res.status(200).json(rows.map(fmt));
  }
  if (req.method === 'POST') {
    const { merchant, amount, txnId, txnDate, txnTime, paymentApp, bank, screenshotUrl } = req.body || {};
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || amt <= 0 || amt > 500000) return res.status(400).json({ error: 'Invalid amount: ' + amount });
    if (!merchant?.trim()) return res.status(400).json({ error: 'Merchant name required' });
    const baseCoins = parseFloat((amt * 0.10).toFixed(1));
    try {
      if (txnId?.trim()) {
        const dup = await sql`SELECT id FROM transactions WHERE user_email=${payload.email} AND txn_id=${txnId.trim()} LIMIT 1`;
        if (dup.length > 0) return res.status(409).json({ error:'duplicate_transaction', message:'This UTR number was already submitted.' });
      } else {
        const dup2 = await sql`SELECT id FROM transactions WHERE user_email=${payload.email} AND amount=${amt} AND merchant=${merchant.trim()} AND created_at>NOW()-INTERVAL '5 minutes' LIMIT 1`;
        if (dup2.length > 0) return res.status(409).json({ error:'duplicate_transaction', message:'A similar transaction was just submitted.' });
      }
      const txRows = await sql`INSERT INTO transactions (user_id,user_email,user_name,merchant,amount,base_coins,bonus_coins,total_coins,txn_id,txn_date,txn_time,payment_app,bank,screenshot_url) VALUES (${payload.userId},${payload.email},${payload.name||''},${merchant.trim()},${amt},${baseCoins},0,${baseCoins},${txnId?.trim()||null},${txnDate||null},${txnTime||null},${paymentApp||null},${bank||null},${screenshotUrl||null}) RETURNING *`;
      await sql`UPDATE users SET coin_balance=coin_balance+${baseCoins},base_coins=base_coins+${baseCoins},updated_at=NOW() WHERE id=${payload.userId}`;
      const uRows = await sql`SELECT coin_balance,base_coins,bonus_coins FROM users WHERE id=${payload.userId}`;
      return res.status(201).json({ transaction:fmt(txRows[0]), coin_balance:Number(uRows[0].coin_balance), base_coins:Number(uRows[0].base_coins), bonus_coins:Number(uRows[0].bonus_coins), coins_earned:baseCoins });
    } catch(err) {
      if (err.code==='23505') return res.status(409).json({ error:'duplicate_transaction', message:'Transaction reference already used.' });
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
