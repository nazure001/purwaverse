// Vercel Serverless API Proxy for Purwaverse IPA VIII
// Bridges client requests to Google Apps Script without CORS or Android Chrome redirect issues.

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Metode tidak didukung. Harap gunakan POST.' });
  }

  const baseUrl = process.env.PURWAVERSE_GAS_URL || 'https://script.google.com/macros/s/AKfycbwMUnknbtXDo7M_HQGL2VfMQlHFZfT-AnMpbQGKEEwKbKXIKHYgVMK0hB4B-LV9gyH_TQ/exec';
  const gasUrl = baseUrl.includes('?') ? baseUrl + '&noredirect=1' : baseUrl + '?noredirect=1';

  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      body: payload,
      redirect: 'follow'
    });

    const responseText = await gasResponse.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { ok: false, error: 'Respons backend tidak valid: ' + responseText.slice(0, 150) };
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Vercel GAS proxy error:', error);
    return res.status(500).json({ ok: false, error: 'Gagal menghubungi server Purwaverse: ' + error.message });
  }
}
