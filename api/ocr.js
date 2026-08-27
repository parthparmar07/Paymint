// POST /api/ocr
// Proxies OCR.space Engine 3 server-side — API key never exposed to browser
// Receives: { base64, mediaType }
// Returns:  { text, lines: [{text, words:[{text,left,top,width,height}]}] }
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OCR_SPACE_API_KEY not set in Vercel environment variables',
    });
  }

  const { base64, mediaType } = req.body || {};
  if (!base64) return res.status(400).json({ error: 'Missing base64 image data' });

  try {
    // Build multipart form for OCR.space API
    const dataUri = `data:${mediaType || 'image/png'};base64,${base64}`;

    const form = new URLSearchParams();
    form.append('base64Image',        dataUri);
    form.append('language',           'eng');
    form.append('OCREngine',          '3');          // Engine 3 = best for mixed layouts
    form.append('isOverlayRequired',  'true');        // get word positions
    form.append('detectOrientation',  'true');
    form.append('scale',              'true');        // upscale small images
    form.append('isTable',            'false');
    form.append('filetype',           'PNG');

    const ocrRes = await fetch('https://api.ocr.space/parse/image', {
      method:  'POST',
      headers: {
        'apikey':       apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = await ocrRes.json();

    if (!ocrRes.ok || data.IsErroredOnProcessing) {
      const msg = data.ErrorMessage?.[0] || data.ErrorDetails || `HTTP ${ocrRes.status}`;
      console.error('[OCR.space]', msg);
      return res.status(502).json({ error: 'OCR.space error: ' + msg });
    }

    const parsed = data.ParsedResults?.[0];
    if (!parsed) {
      return res.status(422).json({ error: 'No parsed results from OCR.space' });
    }

    // Extract raw text
    const text = parsed.ParsedText || '';

    // Extract word-level overlay data with normalised positions
    // TextOverlay.Lines[].Words[].{WordText, Left, Top, Width, Height}
    const lines = (parsed.TextOverlay?.Lines || []).map(line => ({
      text:  line.Words?.map(w => w.WordText).join(' ') || '',
      words: (line.Words || []).map(w => ({
        text:   w.WordText,
        left:   w.Left,
        top:    w.Top,
        width:  w.Width,
        height: w.Height,
      })),
    }));

    return res.status(200).json({ text, lines });

  } catch (err) {
    console.error('[OCR.space] Unexpected:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
