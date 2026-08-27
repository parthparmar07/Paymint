import crypto from 'crypto';
const SECRET = process.env.JWT_SECRET ||
  '25d501ba34270a9318fb2c8288efe7909ea2fc222cd265831f415974402a5529';

function b64url(s) {
  return Buffer.from(s).toString('base64')
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function b64urlDec(s) {
  s = s.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4) s+='=';
  return Buffer.from(s,'base64').toString('utf8');
}
export function signToken(payload) {
  const h   = b64url(JSON.stringify({alg:'HS256',typ:'JWT'}));
  const b   = b64url(JSON.stringify({...payload, iat:Date.now()}));
  const sig = crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${sig}`;
}
export function verifyToken(token) {
  try {
    const [h,b,sig] = token.split('.');
    const expected  = crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url');
    if (sig !== expected) return null;
    const p = JSON.parse(b64urlDec(b));
    if (Date.now() - p.iat > 30*24*60*60*1000) return null;
    return p;
  } catch { return null; }
}
export function authUser(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}
export function isFounder(req) {
  const pw    = req.headers['x-founder-password'] || '';
  const valid = (process.env.FOUNDER_PASSWORD || 'BK11').split(',');
  return valid.includes(pw.trim());
}
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',
    'Content-Type,Authorization,x-founder-password');
}
