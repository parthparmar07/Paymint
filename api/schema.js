import { getDb } from './_db.js';
import { setCorsHeaders } from './_auth.js';
export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const provided = req.query.secret || '';
  const expected = process.env.INIT_SECRET || '1DLSa4yFLf__VSxHnSkYsEJjAFSI0g8P';
  if (provided !== expected) return res.status(403).json({ error: 'Forbidden' });
  const sql = getDb();
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    await sql`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,age TEXT,occupation TEXT,coin_balance NUMERIC(10,1) DEFAULT 0,base_coins NUMERIC(10,1) DEFAULT 0,bonus_coins NUMERIC(10,1) DEFAULT 0,joined_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS transactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,user_email TEXT NOT NULL,user_name TEXT NOT NULL,merchant TEXT NOT NULL,amount NUMERIC(10,2) NOT NULL,base_coins NUMERIC(10,1) NOT NULL,bonus_coins NUMERIC(10,1) DEFAULT 0,total_coins NUMERIC(10,1) NOT NULL,txn_id TEXT,txn_date TEXT,txn_time TEXT,payment_app TEXT,bank TEXT,screenshot_url TEXT,purchase_note TEXT,bonus_claimed BOOLEAN DEFAULT FALSE,verified BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_txn_id ON transactions(user_email,txn_id) WHERE txn_id IS NOT NULL AND txn_id!=''`;
    await sql`CREATE TABLE IF NOT EXISTS rewards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),brand TEXT NOT NULL,label TEXT NOT NULL,cost_coins NUMERIC(10,1) NOT NULL,code TEXT NOT NULL,stock INT DEFAULT 1,active BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS reward_redemptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID REFERENCES users(id) ON DELETE CASCADE,user_email TEXT NOT NULL,brand TEXT NOT NULL,label TEXT NOT NULL,code TEXT NOT NULL,coins_spent NUMERIC(10,1) NOT NULL,redeemed_at TIMESTAMPTZ DEFAULT NOW())`;
    return res.status(200).json({ ok:true, message:'All tables created.', tables:['users','transactions','rewards','reward_redemptions'] });
  } catch(err) { return res.status(500).json({ error: err.message }); }
}
