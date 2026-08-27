# Paymint — Deployment Guide

## What your tech guy needs to do (15 minutes total)

### Step 1 — Create Neon Database (5 min)
1. Go to **neon.tech** → Sign up free
2. Create new project → name it `paymint`
3. Copy the **Connection string**

### Step 2 — Get OCR.space API Key (3 min)
1. Go to **ocr.space** → Sign up free
2. Free tier: 25,000 calls/month
3. Copy your API key from the dashboard

### Step 3 — Push to GitHub (2 min)
```bash
unzip paymint-vercel.zip && cd paymint_v2
git init && git add . && git commit -m "Paymint Beta v2.0"
git remote add origin https://github.com/YOUR/paymint.git
git push -u origin main
```

### Step 4 — Deploy on Vercel (3 min)
1. vercel.com → Add New Project → import repo
2. Framework: **Vite** — Root Directory: leave **blank**
3. Click **Deploy**

### Step 5 — Add Environment Variables
Vercel → your project → **Settings → Environment Variables**

| Variable | Value |
|---|---|
| `JWT_SECRET` | `25d501ba34270a9318fb2c8288efe7909ea2fc222cd265831f415974402a5529` |
| `INIT_SECRET` | `1DLSa4yFLf__VSxHnSkYsEJjAFSI0g8P` |
| `FOUNDER_PASSWORD` | `BK11` |
| `DATABASE_URL` | *from neon.tech* |
| `OCR_SPACE_API_KEY` | *from ocr.space* |
| `CLOUDINARY_CLOUD_NAME` | *optional* |
| `CLOUDINARY_API_KEY` | *optional* |
| `CLOUDINARY_API_SECRET` | *optional* |

Then **Redeploy**.

### Step 6 — Initialise Database (once)
```
https://your-app.vercel.app/api/schema?secret=1DLSa4yFLf__VSxHnSkYsEJjAFSI0g8P
```
Should return: `{"ok":true,"message":"All tables created."}`

---

## Founder Dashboard
Tap **PAYMINT BETA** 5× → Password: **BK11**

## Coin Calculation (server-side)
```
Base reward  = 10% of payment amount
Bonus reward = 5%  of payment amount (purchase details within 1 hour)
Example: ₹100 → 10.0 coins + 5.0 bonus = 15.0 total
```

## OCR Flow
Screenshot → Canvas preprocessing → base64 → /api/ocr (server-side) →
OCR.space Engine 3 → word positions → scoring extraction →
Review if uncertain → backend validates → coins calculated
