import { getDb } from '../_db.js';
import { isFounder, setCorsHeaders } from '../_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { route } = req.query;

  // 1. Auth route
  if (route === 'auth') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { password } = req.body||{};
    const valid = (process.env.FOUNDER_PASSWORD||'BK11').split(',');
    if (!valid.includes((password||'').trim())) return res.status(401).json({ error: 'Invalid password' });
    return res.status(200).json({ ok: true });
  }

  // All other routes require auth
  if (!isFounder(req)) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();

  try {
    // 2. Overview route
    if (route === 'overview') {
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

    // 3. Redemptions route
    if (route === 'redemptions') {
      const rows = await sql`SELECT r.*,u.name AS user_name,u.occupation FROM reward_redemptions r JOIN users u ON u.id=r.user_id ORDER BY r.redeemed_at DESC`;
      return res.status(200).json(rows.map(r=>({id:r.id,user_name:r.user_name,user_email:r.user_email,occupation:r.occupation,brand:r.brand,label:r.label,code:r.code,coins_spent:Number(r.coins_spent),redeemed_at:r.redeemed_at})));
    }

    // 4. Transactions route
    if (route === 'transactions') {
      const rows = await sql`SELECT t.*,u.name AS user_name,u.occupation AS user_occupation FROM transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 500`;
      return res.status(200).json(rows.map(t=>({id:t.id,user_name:t.user_name,user_email:t.user_email,user_occupation:t.user_occupation,merchant:t.merchant,amount:Number(t.amount),base_coins:Number(t.base_coins),bonus_coins:Number(t.bonus_coins),total_coins:Number(t.total_coins),txn_id:t.txn_id,txn_date:t.txn_date,txn_time:t.txn_time,payment_app:t.payment_app,bank:t.bank,screenshot_url:t.screenshot_url,purchase_note:t.purchase_note,bonus_claimed:t.bonus_claimed,created_at:t.created_at})));
    }

    // 5. Users route
    if (route === 'users') {
      if (req.method === 'GET') {
        const users = await sql`SELECT u.id,u.email,u.name,u.age,u.occupation,u.coin_balance,u.base_coins,u.bonus_coins,u.joined_at,COUNT(t.id) AS tx_count,COALESCE(SUM(t.amount),0) AS total_spent,COALESCE(SUM(t.base_coins),0) AS total_base_coins,COALESCE(SUM(t.bonus_coins),0) AS total_bonus_coins,COALESCE(SUM(t.total_coins),0) AS total_coins_earned,COUNT(CASE WHEN t.purchase_note IS NOT NULL THEN 1 END) AS purchase_submissions,MAX(t.created_at) AS last_transaction_at FROM users u LEFT JOIN transactions t ON t.user_id=u.id GROUP BY u.id ORDER BY total_spent DESC NULLS LAST`;
        const txs = await sql`SELECT * FROM transactions ORDER BY created_at DESC`;
        const byUser = {};
        for (const tx of txs) {
          if (!byUser[tx.user_id]) byUser[tx.user_id]=[];
          byUser[tx.user_id].push({id:tx.id,merchant:tx.merchant,amount:Number(tx.amount),base_coins:Number(tx.base_coins),bonus_coins:Number(tx.bonus_coins),total_coins:Number(tx.total_coins),coins:Number(tx.total_coins),txn_id:tx.txn_id,txn_date:tx.txn_date,txn_time:tx.txn_time,payment_app:tx.payment_app,bank:tx.bank,screenshot_url:tx.screenshot_url,purchase_note:tx.purchase_note,bonus_claimed:tx.bonus_claimed,created_at:tx.created_at});
        }
        return res.status(200).json(users.map(u=>({id:u.id,email:u.email,name:u.name,age:u.age,occupation:u.occupation,coin_balance:Number(u.coin_balance),base_coins:Number(u.base_coins),bonus_coins:Number(u.bonus_coins),joined_at:u.joined_at,tx_count:Number(u.tx_count),total_spent:Number(u.total_spent),total_base_coins:Number(u.total_base_coins),total_bonus_coins:Number(u.total_bonus_coins),total_coins_earned:Number(u.total_coins_earned),purchase_submissions:Number(u.purchase_submissions),last_transaction_at:u.last_transaction_at,transactions:byUser[u.id]||[]})));
      }
      if (req.method === 'PATCH') {
        const { action, userId, is_banned, is_demo, name, age, occupation } = req.body||{};
        if (action==='ban')  await sql`UPDATE users SET is_banned=${!!is_banned} WHERE id=${userId}`;
        if (action==='demo') await sql`UPDATE users SET is_demo=${!!is_demo} WHERE id=${userId}`;
        if (action==='edit') await sql`UPDATE users SET name=${name},age=${age||null},occupation=${occupation||null},updated_at=NOW() WHERE id=${userId}`;
        return res.status(200).json({ ok:true });
      }
      if (req.method === 'DELETE') {
        const { userId } = req.body||{};
        await sql`DELETE FROM users WHERE id=${userId}`;
        return res.status(200).json({ ok:true });
      }
    }
    
    return res.status(404).json({ error: 'Route not found' });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
