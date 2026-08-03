const https = require('https');

/**
 * Sends transactional email via Brevo's HTTP API (v3).
 *
 * This bypasses outbound port blocks (25, 465, 587) on cloud platforms
 * like Render by communicating over standard HTTPS (port 443).
 *
 * Required env vars:
 *   BREVO_SMTP_KEY - your Brevo API key (same as SMTP key, starts with xsmtpsib-)
 *   FROM_EMAIL     - the "from" email address
 *   FROM_NAME      - the "from" display name
 */
const sendEmail = async (options) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_SMTP_KEY;
    if (!apiKey) {
      return reject(new Error('Email is not configured: BREVO_API_KEY or BREVO_SMTP_KEY must be set.'));
    }

    const postData = JSON.stringify({
      sender: {
        name: process.env.FROM_NAME || 'HostelBite',
        email: process.env.FROM_EMAIL || 'aslofiworld06@gmail.com'
      },
      to: [
        {
          email: options.email
        }
      ],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.message
    });

    const reqOptions = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
        'content-length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            console.log('Message sent via Brevo HTTP API: %s', parsed.messageId);
            resolve(parsed);
          } catch (e) {
            resolve({ messageId: 'unknown' });
          }
        } else {
          reject(new Error(`Brevo HTTP API returned status code ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Set connection/request timeout to 5 seconds
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Connection timeout trying to reach Brevo HTTP API'));
    });

    req.write(postData);
    req.end();
  });
};

module.exports = sendEmail;
