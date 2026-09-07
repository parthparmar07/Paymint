// POST /api/ocr
// OCR.space proxy — API key server-side only, never exposed to browser
// Engine 3 → Engine 1 fallback
// Self-diagnostic: all decisions logged server-side, no sensitive data exposed
export const config = { maxDuration: 30 };

// ── Amount extraction — mirrors frontend logic exactly ─────────────────────
function parseAmt(raw) {
  let s = raw.trim().replace(/^(?:[₹%?]|Rs\.?\s*|INR\s*)/i, '').trim();
  if (!s) return null;
  if (s.includes('.')) {
    const v = parseFloat(s.replace(/[,\s]/g, ''));
    return (!isNaN(v) && v > 0 && v < 500000) ? v : null;
  }
  const parts = s.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) { const v=parseFloat(parts[0]); return (!isNaN(v)&&v>0&&v<500000)?v:null; }
  if (parts.length === 2) {
    const [L,R] = parts;
    if (/^\d+$/.test(L) && R.length===2 && /^\d+$/.test(R)) { const v=parseFloat(`${L}.${R}`); return (!isNaN(v)&&v>0&&v<500000)?v:null; }
    if (/^\d+$/.test(L) && R.length===3 && /^\d+$/.test(R)) { const v=parseFloat(L+R);          return (!isNaN(v)&&v>0&&v<500000)?v:null; }
  }
  if (parts.length === 3) {
    const [L,M,R] = parts;
    if (/^\d+$/.test(L) && M.length===3 && /^\d+$/.test(M) && R.length===2 && /^\d+$/.test(R)) {
      const v=parseFloat(`${L}${M}.${R}`); return (!isNaN(v)&&v>0&&v<500000)?v:null;
    }
  }
  return null;
}

function isNoise(val, raw) {
  if (!val || val<=0 || val>=500000) return true;
  const d = raw.trim().split('.')[0].replace(/[\s,]/g,'');
  if (d.length>=10) return true;
  if (d.length===10 && '6789'.includes(d[0])) return true;
  if (d.length===8  && d.startsWith('20'))    return true;
  if (d.length===6  && !raw.includes(',') && !raw.includes('.')) return true;
  return false;
}

function diagnoseText(text) {
  // Run extraction and return diagnostic — no raw text logged, only metadata
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n')
                    .split('\n').map(l=>l.trim()).filter(Boolean);
  const n = lines.length;
  const candidates = [];

  const PAT_A = /(?:[₹%?]|Rs\.?|INR)\s*([\d,]+(?:\s\d{3})?(?:\s\d{2})?(?:\.\d{1,2})?)/gi;
  const PAT_B = /(?:amount|paid|total|sent|debited|transferred|charged)[^\d]{0,15}([\d,]+(?:\.\d{1,2})?)/gi;

  for (let i=0; i<n; i++) {
    const line=lines[i], above=i>0?lines[i-1]:'', below=i<n-1?lines[i+1]:'';
    const ctx=line+' '+above+' '+below;

    if (/\b(?:utr|upi\s*ref|ref(?:erence)?\s*no|txn\s*id|ifsc|account\s*no)\b/i.test(line)
        && !/\b(?:paid|amount|total|sent)\b/i.test(line)) continue;

    // Pattern A
    let mA; PAT_A.lastIndex=0;
    while ((mA=PAT_A.exec(line))!==null) {
      const raw=mA[1].trim(), val=parseAmt(raw);
      if (!val||isNoise(val,raw)) continue;
      let sc=80;
      if (raw.includes('.'))  sc+=10; if (raw.includes(',')) sc+=10;
      if (i<n*0.65)           sc+=10;
      if (/\b(?:paid|payment|successful|sent|amount|transferred)\b/i.test(ctx)) sc+=10;
      candidates.push({val,sc,pat:'A',line:i});
    }
    // Pattern B
    let mB; PAT_B.lastIndex=0;
    while ((mB=PAT_B.exec(line))!==null) {
      const raw=mB[1].trim(), val=parseAmt(raw);
      if (!val||isNoise(val,raw)) continue;
      let sc=65+(raw.includes('.')?10:0)+(i<n*0.65?10:0);
      candidates.push({val,sc,pat:'B',line:i});
    }
    // Pattern C: standalone number
    if (/^[\d,]+(?:\.\d{1,2})?$/.test(line)) {
      const val=parseAmt(line);
      if (val&&!isNoise(val,line)) {
        const hc=/[₹%?]|Rs\.?|INR/i.test(above+' '+below);
        const hk=/\b(?:paid|amount|total|sent|successful|payment)\b/i.test(above+' '+below);
        if (hc||hk) {
          let sc=55+(hc?20:0)+(hk?10:0)+(line.includes('.')?10:0)+(i<n*0.65?10:0);
          candidates.push({val,sc,pat:'C',line:i});
        }
      }
    }
    // Pattern D: currency symbol alone then number
    if (/^(?:[₹%?]|Rs\.?|INR)$/i.test(line) && below) {
      const val=parseAmt(below);
      if (val&&!isNoise(val,below)) {
        let sc=75+(below.includes('.')?10:0)+(i<n*0.65?10:0);
        candidates.push({val,sc,pat:'D',line:i});
      }
    }
  }

  // Deduplicate
  const best={};
  for (const c of candidates) {
    if (!(c.val in best)||c.sc>best[c.val].sc) best[c.val]=c;
  }
  const ranked=Object.values(best).sort((a,b)=>b.sc-a.sc);

  let selected=null, reviewReason=null;
  if (!ranked.length) {
    reviewReason='no_candidates';
  } else {
    const top=ranked[0];
    if (top.sc<40) {
      reviewReason=`low_confidence_${top.sc}`;
    } else if (ranked.length>=2) {
      const sec=ranked[1];
      if (sec.val!==top.val && (top.sc-sec.sc)<20 && top.sc<70) {
        reviewReason=`ambiguous_${top.val}_vs_${sec.val}_gap_${top.sc-sec.sc}`;
      } else {
        selected=top.val;
      }
    } else {
      selected=top.val;
    }
  }

  return {
    lineCount:   n,
    candidateCount: ranked.length,
    candidates:  ranked.slice(0,5).map(c=>({val:c.val,sc:c.sc,pat:c.pat})),
    selected,
    reviewReason,
  };
}

async function callOcrSpace(apiKey, base64, mediaType, engine) {
  const form = new URLSearchParams();
  form.append('base64Image',       `data:${mediaType||'image/png'};base64,${base64}`);
  form.append('language',          'eng');
  form.append('OCREngine',         String(engine));
  form.append('isOverlayRequired', 'true');
  form.append('detectOrientation', 'true');
  form.append('scale',             'true');
  form.append('isTable',           'false');
  form.append('filetype',          'PNG');
  const res  = await fetch('https://api.ocr.space/parse/image', {
    method:  'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    form.toString(),
  });
  const data = await res.json();
  return { httpOk: res.ok, data };
}

function extractResult(data) {
  if (data.IsErroredOnProcessing) return null;
  const parsed = data.ParsedResults?.[0];
  if (!parsed) return null;
  const text = (parsed.ParsedText || '').trim();
  if (!text) return null;
  const lines = (parsed.TextOverlay?.Lines || []).map(line => ({
    text:  line.LineText || line.Words?.map(w=>w.WordText).join(' ') || '',
    words: (line.Words||[]).map(w=>({
      text:w.WordText||'', left:w.Left||0, top:w.Top||0, width:w.Width||0, height:w.Height||0,
    })),
  })).filter(l=>l.text.trim());
  return { text, lines };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    console.error('[OCR] FATAL: OCR_SPACE_API_KEY not set in environment variables');
    return res.status(500).json({ error: 'OCR_SPACE_API_KEY not configured' });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'Missing base64 image data' });

  const requestId  = Date.now().toString(36);
  const imageBytes = Math.round(base64.length * 0.75); // approx decoded size

  console.log(`[OCR:${requestId}] START imageBytes=${imageBytes} mediaType=${mediaType||'image/png'}`);

  let result = null, engineUsed = null;

  // ── Engine 3 attempt ──────────────────────────────────────────────
  try {
    console.log(`[OCR:${requestId}] Trying Engine 3...`);
    const { httpOk, data } = await callOcrSpace(apiKey, base64, mediaType, 3);
    if (httpOk) {
      result = extractResult(data);
      if (result) {
        engineUsed = 3;
        console.log(`[OCR:${requestId}] Engine 3 SUCCESS textLen=${result.text.length} lines=${result.lines.length}`);
      } else {
        const err = data.ParsedResults?.[0]?.ErrorMessage || data.ErrorMessage?.[0] || 'empty result';
        console.warn(`[OCR:${requestId}] Engine 3 empty: ${err}`);
      }
    } else {
      const err = data.ErrorMessage?.[0] || data.error || `HTTP ${data}`;
      console.warn(`[OCR:${requestId}] Engine 3 HTTP error: ${err}`);
    }
  } catch (e) {
    console.warn(`[OCR:${requestId}] Engine 3 exception: ${e.message}`);
  }

  // ── Engine 1 fallback ─────────────────────────────────────────────
  if (!result) {
    try {
      console.log(`[OCR:${requestId}] Trying Engine 1 fallback...`);
      const { httpOk, data } = await callOcrSpace(apiKey, base64, mediaType, 1);
      if (httpOk) {
        result = extractResult(data);
        if (result) {
          engineUsed = 1;
          console.log(`[OCR:${requestId}] Engine 1 SUCCESS textLen=${result.text.length} lines=${result.lines.length}`);
        } else {
          const err = data.ParsedResults?.[0]?.ErrorMessage || data.ErrorMessage?.[0] || 'empty result';
          console.error(`[OCR:${requestId}] Engine 1 empty: ${err}`);
        }
      } else {
        const err = data.ErrorMessage?.[0] || data.error || 'HTTP error';
        console.error(`[OCR:${requestId}] Engine 1 HTTP error: ${err}`);
      }
    } catch (e) {
      console.error(`[OCR:${requestId}] Engine 1 exception: ${e.message}`);
    }
  }

  if (!result) {
    console.error(`[OCR:${requestId}] FAILED both engines — sending to Review`);
    return res.status(502).json({
      error: 'OCR failed on both Engine 3 and Engine 1',
      requestId,
    });
  }

  // ── Server-side extraction diagnostic (no raw text logged) ────────
  const diag = diagnoseText(result.text);
  console.log(
    `[OCR:${requestId}] EXTRACT engine=${engineUsed}` +
    ` lines=${diag.lineCount} candidates=${diag.candidateCount}` +
    ` top=${diag.candidates[0] ? `₹${diag.candidates[0].val}(sc=${diag.candidates[0].sc},pat=${diag.candidates[0].pat})` : 'none'}` +
    ` selected=${diag.selected !== null ? `₹${diag.selected}` : 'none'}` +
    ` ${diag.reviewReason ? `REVIEW reason=${diag.reviewReason}` : 'AUTO'}`
  );

  // Include diagnostic in response (frontend logs it, never shows to user)
  return res.status(200).json({
    text:      result.text,
    lines:     result.lines,
    requestId,
    _diag: {
      engine:         engineUsed,
      textLen:        result.text.length,
      lineCount:      diag.lineCount,
      candidates:     diag.candidates,
      selected:       diag.selected,
      reviewReason:   diag.reviewReason,
    },
  });
}
