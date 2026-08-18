# Paymint Beta v2.0

UPI Rewards App — React + Vite + Neon PostgreSQL + Vercel Serverless + Cloudinary

## Architecture
- Frontend: React + Framer Motion + Tesseract.js OCR
- Backend: Vercel Serverless Functions (/api/*)
- Database: Neon PostgreSQL (never pauses)
- Storage: Cloudinary (screenshot uploads)
- Auth: JWT tokens (server-issued, never expires client-side data)

## Environment Variables (set in Vercel dashboard)
DATABASE_URL=postgresql://...        # from neon.tech
JWT_SECRET=your-random-secret-here  # any long random string
FOUNDER_PASSWORD=BK11               # can be comma-separated for multiple founders
INIT_SECRET=your-init-secret        # used once to create tables
CLOUDINARY_CLOUD_NAME=...           # from cloudinary.com (optional)
CLOUDINARY_API_KEY=...              # from cloudinary.com (optional)
CLOUDINARY_API_SECRET=...           # from cloudinary.com (optional)

## Setup (one time)
1. Create Neon database at neon.tech (free)
2. Add DATABASE_URL to Vercel env vars
3. Deploy to Vercel
4. Visit https://your-app.vercel.app/api/schema?secret=YOUR_INIT_SECRET
   This creates all tables automatically.
5. Done — start testing

## Deploy
Push to GitHub → Vercel auto-deploys

## Founder Dashboard
Tap PAYMINT BETA wordmark 5× → Password set in FOUNDER_PASSWORD env var (default: BK11)

## Coin Calculation (server-side, cannot be manipulated)
Base reward  = 10% of payment amount
Bonus reward = 5%  of payment amount (if purchase details submitted within 1 hour)
Example: ₹100 → 10.0 base coins + 5.0 bonus = 15.0 total
