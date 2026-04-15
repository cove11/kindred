exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  try {
    const body = JSON.parse(event.body);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
                                        body: JSON.stringify({ model: body.model || 'claude-opus-4-6', max_tokens: body.max_tokens || 600, system: body.system || '', messages: body.messages })
                                      });
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
