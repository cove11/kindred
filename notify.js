const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Silently skip if not configured — don't break the app
    console.log('RESEND_API_KEY not set, skipping email notification');
    return { statusCode: 200, body: JSON.stringify({ skipped: true }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { to, residentName, careHomeName, reviewType, senderName } = payload;
  if (!to || !residentName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  const subject = `New update from ${careHomeName || 'the care home'} about ${residentName}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a1a18;">
      <div style="margin-bottom:24px;">
        <img src="https://rad-melomakarona-fce1e2.netlify.app/logo.png" alt="Kindred" style="height:32px;" onerror="this.style.display='none'"/>
        <span style="font-size:20px;font-weight:700;color:#1a1a18;vertical-align:middle;margin-left:8px;">Kindred</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#1a1a18;margin:0 0 8px;">A new update from ${careHomeName || 'the care home'}</h1>
      <p style="font-size:15px;color:#666;line-height:1.6;margin:0 0 24px;">
        ${senderName || 'The care team'} has shared a new <strong>${reviewType || 'care update'}</strong> about <strong>${residentName}</strong>. Log in to Kindred to read it.
      </p>
      <a href="https://rad-melomakarona-fce1e2.netlify.app" style="display:inline-block;background:#4a7c6f;color:#fff;padding:13px 24px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;">View update in Kindred</a>
      <p style="font-size:12px;color:#aaa;margin-top:32px;line-height:1.6;">You're receiving this because you're a family member on the Kindred portal for ${residentName}. <a href="#" style="color:#aaa;">Manage preferences</a></p>
    </div>
  `;

  const emailBody = JSON.stringify({
    from: 'Kindred <notifications@kindredcare.app>',
    to: Array.isArray(to) ? to : [to],
    subject,
    html
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(emailBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Resend response:', res.statusCode, data);
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ sent: res.statusCode < 300, status: res.statusCode })
        });
      });
    });

    req.on('error', (e) => {
      console.error('Email error:', e.message);
      resolve({ statusCode: 200, body: JSON.stringify({ error: e.message }) });
    });

    req.write(emailBody);
    req.end();
  });
};
