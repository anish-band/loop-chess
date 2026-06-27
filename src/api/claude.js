export async function explainBestMove({ fen, bestMoveSan, evalScore, classification }) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

  const prompt = `You are a chess coach. In 2-3 concise sentences, explain why ${bestMoveSan} is the best move in this position (FEN: ${fen}). Eval: ${evalScore ?? 'unknown'}${classification ? `, previous move was a ${classification}` : ''}. Focus on the key idea or tactical/strategic insight. Chess-player language, no fluff.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}
