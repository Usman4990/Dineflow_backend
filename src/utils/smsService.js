const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const { formatToE164 } = require('./phoneFormatter');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'sms.log');

console.log('SMS Log File:', LOG_FILE);

const ensureLogFolder = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const logSmsEvent = async ({ recipient, status, errorMsg, orderId, userId }) => {
  console.log('[DEBUG] SMS log write started');
  try {
    ensureLogFolder();
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      eventType: 'SMS',
      recipient,
      status,
      orderId: orderId ? Number(orderId) : null,
      userId: userId ? Number(userId) : null,
      error: errorMsg || null,
    };
    await fs.promises.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
    console.log('[DEBUG] SMS log write successful');
    console.log(
      `[${timestamp}] [SMS] [${status}] Recipient: ${recipient}` +
        `${orderId ? ` | Order #${orderId}` : ''}` +
        `${userId ? ` | User #${userId}` : ''}` +
        `${errorMsg ? ` | Error: ${errorMsg}` : ''}`
    );
  } catch (err) {
    console.log('[DEBUG] SMS log write failed:', err.message);
    console.error('Failed to write SMS audit log:', err.message);
  }
};

const requestJson = (options, body) => {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: data });
        } else {
          reject(new Error(`Request failed ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(body);
    }
    req.end();
  });
};

/**
 * Send an SMS via Twilio.
 * Falls back to structured logging when Twilio credentials are not configured.
 */
const sendSms = async ({ to, body, orderId, userId }) => {
  console.log('[DEBUG] SMS request received');
  try {
    if (!to) {
      console.log('[DEBUG] Phone number detected: NONE');
      await logSmsEvent({ recipient: 'UNKNOWN', status: 'FAILED', errorMsg: 'Missing phone number', orderId, userId });
      return { success: false, message: 'SMS skipped: missing recipient phone number.' };
    }

    console.log('[DEBUG] Phone number detected:', to);

      // Normalize phone number to E.164 before sending
      const formattedTo = formatToE164(to);
      console.log('[DEBUG] Phone number formatting:', { input: to, formatted: formattedTo });
      if (!formattedTo) {
        await logSmsEvent({ recipient: to, status: 'FAILED', errorMsg: `Invalid phone after formatting. Original: ${to}`, orderId, userId });
        return { success: false, message: 'SMS skipped: invalid recipient phone number.' };
      }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    console.log('[DEBUG] Twilio credentials loaded:', {
      accountSid: accountSid ? 'FOUND' : 'MISSING',
      authToken: authToken ? 'FOUND' : 'MISSING',
      fromNumber: fromNumber ? 'FOUND' : 'MISSING'
    });

    if (accountSid && authToken && fromNumber) {
      const payload = querystring.stringify({
        From: fromNumber,
        To: formattedTo,
        Body: body,
      });

      const options = {
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      console.log('[DEBUG] SMS send attempt started');
      try {
        const response = await requestJson(options, payload);
        console.log('[DEBUG] Twilio response received:', response.statusCode);
        await logSmsEvent({ recipient: formattedTo, status: 'SUCCESS', orderId, userId });
        return { success: true, message: `SMS queued to ${formattedTo} via Twilio.` };
      } catch (error) {
        console.log('[DEBUG] Twilio response received (error):', error.message);
        await logSmsEvent({ recipient: formattedTo, status: 'FAILED', errorMsg: `Original: ${to} | Twilio: ${error.message}`, orderId, userId });
        return { success: false, error: error.message };
      }
    }

    await logSmsEvent({ recipient: formattedTo || to, status: 'FALLBACK', errorMsg: 'Twilio credentials missing', orderId, userId });
    return { success: true, message: 'SMS logged because Twilio is not configured.' };
  } catch (error) {
    console.error('Unhandled exception in sendSms:', error.message || error);
    await logSmsEvent({ recipient: to || 'UNKNOWN', status: 'FAILED', errorMsg: `Unhandled exception: ${error.message}`, orderId, userId });
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendSms,
};
