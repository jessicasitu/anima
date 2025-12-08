export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Server is missing ANTHROPIC_API_KEY env var'
    });
  }

  let body = {};
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body || '{}');
    } else if (req.body) {
      body = req.body;
    }
  } catch (e) {
    console.error('Invalid JSON body:', e);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  const { systemPrompt, userPrompt } = body;

  if (!systemPrompt || !userPrompt) {
    return res.status(400).json({ error: 'Missing prompts' });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('Anthropic error:', upstream.status, text);
      return res.status(upstream.status).json({
        error: 'Anthropic request failed',
        status: upstream.status,
        detail: text
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse Anthropic JSON:', e, text);
      return res.status(500).json({
        error: 'Could not parse Anthropic response',
        detail: text
      });
    }

    const replyText = data?.content?.[0]?.text || '';

    return res.status(200).json({ reply: replyText });
  } catch (err) {
    console.error('Server error calling Anthropic:', err);
    return res.status(500).json({
      error: 'Server error',
      detail: String(err)
    });
  }
}