// POST /api/ocr
// OCR.space proxy — API key server-side only, never in browser/GitHub
// Engine 3 → Engine 1 fallback with full self-diagnostic Vercel logging
export const config = { maxDuration: 30, api: { bodyParser: { sizeLimit: '10mb' } } };

// ── Noise rejection ────────────────────────────────────────────────────────
function isNoise(val, raw) {
  if (!val || val <= 0 || val >= 500000) return true;
  const d = raw.trim().split('.')[0].replace(/[\s,]/g, '');
  if (d.length >= 10) return true;
  if (d.length === 10 && '6789'.includes(d[0])) return true;
  if (d.length === 8 && d.startsWith('20')) return true;
  if (d.length === 6 && !raw.includes(',') && !raw.includes('.')) return true;
  return false;
}

// ── Amount parser ──────────────────────────────────────────────────────────
function parseAmt(raw) {
  let s = raw.trim().replace(/^(?:[₹%?]|Rs\.?\s*|INR\s*)/i, '').trim();
  if (!s) return null;
  if (s.includes('.')) {
    const v = parseFloat(s.replace(/[,\s]/g, ''));
    return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
  }
  const parts = s.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const v = parseFloat(parts[0]);
    return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
  }
  if (parts.length === 2) {
    const [L, R] = parts;
    if (/^\d+$/.test(L) && R.length === 2 && /^\d+$/.test(R)) {
      const v = parseFloat(`${L}.${R}`);
      return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
    }
    if (/^\d+$/.test(L) && R.length === 3 && /^\d+$/.test(R)) {
      const v = parseFloat(L + R);
      return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
    }
  }
  if (parts.length === 3) {
    const [L, M, R] = parts;
    if (/^\d+$/.test(L) && M.length === 3 && /^\d+$/.test(M) && R.length === 2 && /^\d+$/.test(R)) {
      const v = parseFloat(`${L}${M}.${R}`);
      return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
    }
  }
  return null;
}

// ── Server-side diagnostic (logs metadata only, no raw text/screenshot) ────
function diagnoseText(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
                    .split('\n').map(l => l.trim()).filter(Boolean);
  const n = lines.length;
  const candidates = [];
  const PAT_A = /(?:[₹%?]|Rs\.?|INR)\s*([\d,]+(?:\s\d{3})?(?:\s\d{2})?(?:\.\d{1,2})?)/gi;
  const PAT_B = /(?:amount|paid|total|sent|debited|transferred|charged)[^\d]{0,15}([\d,]+(?:\.\d{1,2})?)/gi;

  for (let i = 0; i < n; i++) {
    const line = lines[i];
    const above = i > 0 ? lines[i-1] : '';
    const below = i < n-1 ? lines[i+1] : '';
    const ctx = `${line} ${above} ${below}`;

    if (/\b(?:utr|upi\s*ref|ref(?:erence)?\s*no|txn\s*id|ifsc|account\s*no)\b/i.test(line)
        && !/\b(?:paid|amount|total|sent)\b/i.test(line)) continue;

    let mA; PAT_A.lastIndex = 0;
    while ((mA = PAT_A.exec(line)) !== null) {
      const raw = mA[1].trim(), val = parseAmt(raw);
      if (!val || isNoise(val, raw)) continue;
      let sc = 80;
      if (raw.includes('.')) sc += 10;
      if (raw.includes(',')) sc += 10;
      if (i < n * 0.65) sc += 10;
      if (/\b(?:paid|payment|successful|sent|amount|transferred)\b/i.test(ctx)) sc += 10;
      candidates.push({ val, sc, pat: 'A' });
    }
    let mB; PAT_B.lastIndex = 0;
    while ((mB = PAT_B.exec(line)) !== null) {
      const raw = mB[1].trim(), val = parseAmt(raw);
      if (!val || isNoise(val, raw)) continue;
      const sc = 65 + (raw.includes('.') ? 10 : 0) + (i < n * 0.65 ? 10 : 0);
      candidates.push({ val, sc, pat: 'B' });
    }
    if (/^[\d,]+(?:\.\d{1,2})?$/.test(line)) {
      const val = parseAmt(line);
      if (val && !isNoise(val, line)) {
        const hc = /[₹%?]|Rs\.?|INR/i.test(`${above} ${below}`);
        const hk = /\b(?:paid|amount|total|sent|successful|payment)\b/i.test(`${above} ${below}`);
        if (hc || hk) {
          const sc = 55 + (hc ? 20 : 0) + (hk ? 10 : 0) + (line.includes('.') ? 10 : 0) + (i < n * 0.65 ? 10 : 0);
          candidates.push({ val, sc, pat: 'C' });
        }
      }
    }
    if (/^(?:[₹%?]|Rs\.?|INR)$/i.test(line) && below) {
      const val = parseAmt(below);
      if (val && !isNoise(val, below)) {
        const sc = 75 + (below.includes('.') ? 10 : 0) + (i < n * 0.65 ? 10 : 0);
        candidates.push({ val, sc, pat: 'D' });
      }
    }
  }

  const best = {};
  for (const c of candidates) {
    if (!(c.val in best) || c.sc > best[c.val].sc) best[c.val] = c;
  }
  const ranked = Object.values(best).sort((a, b) => b.sc - a.sc);

  let selected = null, reviewReason = null;
  if (!ranked.length) {
    reviewReason = 'no_candidates';
  } else {
    const top = ranked[0];
    if (top.sc < 40) {
      reviewReason = `low_confidence_${top.sc}`;
    } else if (ranked.length >= 2) {
      const sec = ranked[1];
      if (sec.val !== top.val && (top.sc - sec.sc) < 20 && top.sc < 70) {
        reviewReason = `ambiguous_${top.val}_vs_${sec.val}`;
      } else {
        selected = top.val;
      }
    } else {
      selected = top.val;
    }
  }

  return { lineCount: n, candidateCount: ranked.length,
           candidates: ranked.slice(0, 5).map(c => ({ val: c.val, sc: c.sc, pat: c.pat })),
           selected, reviewReason };
}

// ── Detect file type from base64 header ───────────────────────────────────
function detectFileType(base64) {
  // First few chars of base64 reveal the file magic bytes
  const sig = base64.substring(0, 4);
  if (sig === '/9j/') return { mime: 'image/jpeg', ext: 'JPG' };
  if (sig === 'iVBO') return { mime: 'image/png',  ext: 'PNG' };
  if (sig === 'R0lG') return { mime: 'image/gif',  ext: 'GIF' };
  if (sig === 'UklG') return { mime: 'image/webp', ext: 'WEBP' };
  return { mime: 'image/jpeg', ext: 'JPG' }; // default to JPEG for phone screenshots
}

// ── OCR.space API call ────────────────────────────────────────────────────
async function callOcrSpace(apiKey, base64, mediaType, engine) {
  // Auto-detect file type from base64 if not provided
  const detected   = detectFileType(base64);
  const actualMime = mediaType || detected.mime;
  const fileType   = detected.ext; // always use detected, not trusting client

  const form = new URLSearchParams();
  form.append('base64Image',       `data:${actualMime};base64,${base64}`);
  form.append('language',          'eng');
  form.append('OCREngine',         String(engine));
  form.append('isOverlayRequired', 'true');
  form.append('detectOrientation', 'true');
  form.append('scale',             'true');
  form.append('isTable',           'false');
  form.append('filetype',          fileType);

  const res  = await fetch('https://api.ocr.space/parse/image', {
    method:  'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    form.toString(),
  });
  const data = await res.json();
  return { httpOk: res.ok, data };
}

// ── Extract usable result from OCR.space response ─────────────────────────
function extractResult(data) {
  if (data.IsErroredOnProcessing) return null;
  const parsed = data.ParsedResults?.[0];
  if (!parsed) return null;
  const text = (parsed.ParsedText || '').trim();
  if (!text) return null;
  const lines = (parsed.TextOverlay?.Lines || []).map(line => ({
    text:  line.LineText || line.Words?.map(w => w.WordText).join(' ') || '',
    words: (line.Words || []).map(w => ({
      text: w.WordText || '', left: w.Left || 0, top: w.Top || 0,
      width: w.Width || 0,   height: w.Height || 0,
    })),
  })).filter(l => l.text.trim());
  return { text, lines };
}

// ── Main handler ──────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.error('[OCR] FATAL: OCR_SPACE_API_KEY not set in Vercel env vars');
    return res.status(500).json({ error: 'OCR_SPACE_API_KEY not configured in Vercel environment variables' });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'Missing base64 image data' });

  const requestId  = Date.now().toString(36).toUpperCase();
  const imageBytes = Math.round(base64.length * 0.75);
  const detected   = detectFileType(base64);

  console.log(`[OCR:${requestId}] START bytes≈${imageBytes} detectedType=${detected.ext} clientType=${mediaType||'none'}`);

  // Check size — OCR.space free tier has a 1MB limit per request
  if (imageBytes > 900000) {
    console.warn(`[OCR:${requestId}] Image too large (${imageBytes} bytes) — may fail on free tier`);
  }

  let result = null, engineUsed = null;

  // Engine 3 (best for modern UPI app screens)
  try {
    console.log(`[OCR:${requestId}] Trying Engine 3 (${detected.ext})...`);
    const { httpOk, data } = await callOcrSpace(apiKey, base64, mediaType, 3);
    if (httpOk) {
      result = extractResult(data);
      if (result) {
        engineUsed = 3;
        console.log(`[OCR:${requestId}] Engine 3 OK: textLen=${result.text.length} lines=${result.lines.length}`);
      } else {
        const errMsg = data.ParsedResults?.[0]?.ErrorMessage
                    || (Array.isArray(data.ErrorMessage) ? data.ErrorMessage[0] : data.ErrorMessage)
                    || data.ErrorDetails || 'empty result';
        console.warn(`[OCR:${requestId}] Engine 3 empty: ${errMsg}`);
      }
    } else {
      const errMsg = (Array.isArray(data.ErrorMessage) ? data.ErrorMessage[0] : data.ErrorMessage)
                  || data.error || `HTTP error`;
      console.warn(`[OCR:${requestId}] Engine 3 HTTP error: ${errMsg}`);
    }
  } catch (e) {
    console.warn(`[OCR:${requestId}] Engine 3 exception: ${e.message}`);
  }

  // Engine 1 fallback (most reliable on free tier)
  if (!result) {
    try {
      console.log(`[OCR:${requestId}] Trying Engine 1 fallback...`);
      const { httpOk, data } = await callOcrSpace(apiKey, base64, mediaType, 1);
      if (httpOk) {
        result = extractResult(data);
        if (result) {
          engineUsed = 1;
          console.log(`[OCR:${requestId}] Engine 1 OK: textLen=${result.text.length} lines=${result.lines.length}`);
        } else {
          const errMsg = data.ParsedResults?.[0]?.ErrorMessage
                      || (Array.isArray(data.ErrorMessage) ? data.ErrorMessage[0] : data.ErrorMessage)
                      || data.ErrorDetails || 'empty result';
          console.error(`[OCR:${requestId}] Engine 1 empty: ${errMsg}`);
        }
      } else {
        const errMsg = (Array.isArray(data.ErrorMessage) ? data.ErrorMessage[0] : data.ErrorMessage)
                    || data.error || `HTTP error`;
        console.error(`[OCR:${requestId}] Engine 1 HTTP error: ${errMsg}`);
      }
    } catch (e) {
      console.error(`[OCR:${requestId}] Engine 1 exception: ${e.message}`);
    }
  }

  if (!result) {
    console.error(`[OCR:${requestId}] FAILED both engines`);
    return res.status(502).json({
      error: 'OCR.space could not read this image. Both Engine 3 and Engine 1 failed.',
      hint:  'Check OCR_SPACE_API_KEY in Vercel env vars and verify the image is a clear screenshot.',
      requestId,
    });
  }

  // Server-side diagnostic
  const diag = diagnoseText(result.text);
  const topC = diag.candidates[0];
  console.log(
    `[OCR:${requestId}] EXTRACT engine=${engineUsed}` +
    ` lines=${diag.lineCount} candidates=${diag.candidateCount}` +
    ` top=${topC ? `Rs${topC.val}(sc=${topC.sc},pat=${topC.pat})` : 'none'}` +
    ` selected=${diag.selected != null ? `Rs${diag.selected}` : 'none'}` +
    ` ${diag.reviewReason ? `REVIEW:${diag.reviewReason}` : 'AUTO'}`
  );

  return res.status(200).json({
    text:  result.text,
    lines: result.lines,
    requestId,
    _diag: {
      engine: engineUsed, textLen: result.text.length,
      lineCount: diag.lineCount, candidateCount: diag.candidateCount,
      candidates: diag.candidates, selected: diag.selected,
      reviewReason: diag.reviewReason,
    },
  });
}
