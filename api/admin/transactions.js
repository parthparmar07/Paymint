import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();
  const rows = await sql`SELECT t.*,u.name AS user_name,u.occupation AS user_occupation FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`;
  return res.status(200).json(rows.map(t=>({id:t.id,user_name:t.user_name,user_email:t.user_email,user_occupation:t.user_occupation,merchant:t.merchant,amount:Number(t.amount),base_coins:Number(t.base_coins),bonus_coins:Number(t.bonus_coins),total_coins:Number(t.total_coins),txn_id:t.txn_id,txn_date:t.txn_date,txn_time:t.txn_time,payment_app:t.payment_app,bank:t.bank,screenshot_url:t.screenshot_url,purchase_note:t.purchase_note,bonus_claimed:t.bonus_claimed,created_at:t.created_at})));
}
