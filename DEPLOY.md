# Paymint — Deployment Guide

## What your tech guy needs to do (15 minutes total)

---

### Step 1 — Create Neon Database (5 min)

1. Go to **neon.tech** → Sign up free
2. Create new project → name it `paymint`
3. Copy the **Connection string** — looks like:
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

---

### Step 2 — Push to GitHub (2 min)

```bash
unzip paymint-vercel.zip
cd paymint_v2
git init
git add .
git commit -m "Paymint Beta v2.0"
git remote add origin https://github.com/YOUR_USERNAME/paymint.git
git push -u origin main
```

---

### Step 3 — Deploy on Vercel (3 min)

1. Go to **vercel.com** → Add New Project
2. Import the `paymint` repo from GitHub
3. Framework auto-detected as **Vite**
4. Root Directory: leave **blank**
5. Click **Deploy** (first deploy will fail — that's expected before env vars)

---

### Step 4 — Add Environment Variables (3 min)

Go to Vercel → your project → **Settings → Environment Variables**

Add these — copy exactly:

| Variable | Value |
|---|---|
| `JWT_SECRET` | `25d501ba34270a9318fb2c8288efe7909ea2fc222cd265831f415974402a5529` |
| `INIT_SECRET` | `1DLSa4yFLf__VSxHnSkYsEJjAFSI0g8P` |
| `FOUNDER_PASSWORD` | `BK11` |
| `DATABASE_URL` | *paste your Neon connection string* |
| `CLOUDINARY_CLOUD_NAME` | *from cloudinary.com (optional)* |
| `CLOUDINARY_API_KEY` | *from cloudinary.com (optional)* |
| `CLOUDINARY_API_SECRET` | *from cloudinary.com (optional)* |

After adding env vars → click **Redeploy**

---

### Step 5 — Initialise Database (1 min)

Once the app is live, open this URL in browser **once**:

```
https://your-app.vercel.app/api/schema?secret=1DLSa4yFLf__VSxHnSkYsEJjAFSI0g8P
```

You should see:
```json
{
  "ok": true,
  "message": "All tables created successfully.",
  "tables": ["users","transactions","rewards","reward_redemptions"]
}
```

**Done.** The app is fully live.

---

## Cloudinary Setup (optional — for screenshot storage)

1. Go to **cloudinary.com** → Sign up free (25GB storage)
2. Dashboard → copy Cloud Name, API Key, API Secret
3. Add to Vercel env vars (Step 4 above)
4. Redeploy

If Cloudinary is not configured, screenshots are simply not stored.
Coins are still awarded — screenshot storage is non-blocking.

---

## Future Updates

Every code change:
```bash
git add src/App.jsx
git commit -m "describe change"
git push
```
Vercel auto-redeploys in ~60 seconds.

---

## Founder Dashboard

- Tap **PAYMINT BETA** wordmark **5 times**
- Password: **BK11**
- Change by updating `FOUNDER_PASSWORD` in Vercel env vars

---

## Coin Calculation (server-side, cannot be manipulated)

```
Base reward  = 10% of payment amount
Bonus reward = 5%  of payment amount (if purchase details submitted within 1 hour)

Example: ₹100 payment
  → 10.0 base coins  (awarded immediately)
  → 5.0 bonus coins  (if purchase details submitted)
  → 15.0 total coins maximum
```

---

## Secrets Summary

| Secret | Pre-generated | Needs your input |
|---|---|---|
| JWT_SECRET | ✅ already in this doc | — |
| INIT_SECRET | ✅ already in this doc | — |
| FOUNDER_PASSWORD | ✅ BK11 | — |
| DATABASE_URL | — | ✅ from neon.tech |
| CLOUDINARY_* | — | ✅ from cloudinary.com (optional) |
