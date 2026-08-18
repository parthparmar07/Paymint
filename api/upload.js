// POST /api/upload — get Cloudinary signed upload URL
// Credentials stay server-side — client never sees the API secret
import crypto from 'crypto';
import { authUser, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = authUser(req);
  if (!payload) return res.status(401).json({ error: 'Unauthorised' });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Cloudinary not configured' });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder    = `paymint/${payload.userId}`;
  const params    = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha256')
    .update(params + apiSecret)
    .digest('hex');

  return res.status(200).json({
    url:        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    api_key:    apiKey,
    timestamp,
    signature,
    folder,
  });
}
