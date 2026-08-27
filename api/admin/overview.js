import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();
  const [stats] = await sql`SELECT COUNT(DISTINCT u.id) AS total_users,COUNT(DISTINCT CASE WHEN u.joined_at>NOW()-INTERVAL '7 days' THEN u.id END) AS new_users_7d,COUNT(t.id) AS total_transactions,COALESCE(SUM(t.amount),0) AS total_spend,COALESCE(SUM(t.base_coins),0) AS total_base_coins,COALESCE(SUM(t.bonus_coins),0) AS total_bonus_coins,COALESCE(SUM(t.total_coins),0) AS total_coins_issued,COALESCE(AVG(t.amount),0) AS avg_tx_value,COALESCE(SUM(t.amount)/NULLIF(COUNT(DISTINCT t.user_id),0),0) AS avg_spend_per_user,COUNT(CASE WHEN t.purchase_note IS NOT NULL THEN 1 END) AS purchase_submissions,COUNT(CASE WHEN t.bonus_claimed=true THEN 1 END) AS bonus_claims FROM users u LEFT JOIN transactions t ON t.user_id=u.id`;
  const topMerchants = await sql`SELECT merchant,COUNT(*) AS tx_count,SUM(amount) AS total_amount FROM transactions GROUP BY merchant ORDER BY tx_count DESC LIMIT 10`;
  const topSpenders  = await sql`SELECT u.name,u.email,u.occupation,COUNT(t.id) AS tx_count,COALESCE(SUM(t.amount),0) AS total_spent,u.coin_balance,u.base_coins,u.bonus_coins FROM users u LEFT JOIN transactions t ON t.user_id=u.id GROUP BY u.id ORDER BY total_spent DESC NULLS LAST LIMIT 10`;
  const trend        = await sql`SELECT DATE(created_at) AS day,COUNT(*) AS tx_count,SUM(amount) AS total_amount,SUM(total_coins) AS coins_issued FROM transactions WHERE created_at>NOW()-INTERVAL '14 days' GROUP BY DATE(created_at) ORDER BY day ASC`;
  const appBreakdown = await sql`SELECT payment_app,COUNT(*) AS tx_count,SUM(amount) AS total_amount FROM transactions WHERE payment_app IS NOT NULL GROUP BY payment_app ORDER BY tx_count DESC`;
  return res.status(200).json({
    stats:{total_users:Number(stats.total_users),new_users_7d:Number(stats.new_users_7d),total_transactions:Number(stats.total_transactions),total_spend:Number(stats.total_spend),total_base_coins:Number(stats.total_base_coins),total_bonus_coins:Number(stats.total_bonus_coins),total_coins_issued:Number(stats.total_coins_issued),avg_tx_value:Number(Number(stats.avg_tx_value).toFixed(2)),avg_spend_per_user:Number(Number(stats.avg_spend_per_user).toFixed(2)),purchase_submissions:Number(stats.purchase_submissions),bonus_claims:Number(stats.bonus_claims)},
    top_merchants:topMerchants.map(m=>({merchant:m.merchant,tx_count:Number(m.tx_count),total_amount:Number(m.total_amount)})),
    top_spenders:topSpenders.map(u=>({name:u.name,email:u.email,occupation:u.occupation,tx_count:Number(u.tx_count),total_spent:Number(u.total_spent),coin_balance:Number(u.coin_balance),base_coins:Number(u.base_coins),bonus_coins:Number(u.bonus_coins)})),
    spending_trend:trend.map(d=>({day:d.day,tx_count:Number(d.tx_count),total_amount:Number(d.total_amount),coins_issued:Number(d.coins_issued)})),
    app_breakdown:appBreakdown.map(a=>({app:a.payment_app,tx_count:Number(a.tx_count),total_amount:Number(a.total_amount)})),
  });
}
