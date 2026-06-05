const { formatToE164 } = require('./phoneFormatter');

// 🔧 DEBUG START (yahin add karo)
console.log("EMAIL MODULE ACTIVE");
console.log(process.env.SENDGRID_API_KEY ? "KEY OK" : "KEY MISSING");
// 🔧 DEBUG END`
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const { formatToE164 } = require('./phoneFormatter');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'notifications.log');

const ensureLogFolder = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

/**
 * Log notification events into structured JSON audit format
 */
const logNotification = ({ eventType, recipient, status, errorMsg, orderId, userId }) => {
  try {
    ensureLogFolder();
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      eventType, // EMAIL or SMS
      recipient,
      status, // SUCCESS, FAILED, or FALLBACK
      orderId: orderId ? parseInt(orderId, 10) : null,
      userId: userId ? parseInt(userId, 10) : null,
      error: errorMsg || null,
    };
    
    fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
    
    // Console output for active monitoring in production/dev
    console.log(
      `[${timestamp}] [NOTIFICATION] [${eventType}] [${status}] Recipient: ${recipient}` +
      `${orderId ? ` | Order #${orderId}` : ''}` +
      `${userId ? ` | User #${userId}` : ''}` +
      `${errorMsg ? ` | Error: ${errorMsg}` : ''}`
    );
  } catch (err) {
    console.error('Failed to write notification audit logs:', err.message);
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

const sendEmail = async ({ to, subject, text, html, orderId, userId }) => {
  if (!to) {
    logNotification({
      eventType: 'EMAIL',
      recipient: 'UNKNOWN',
      status: 'FAILED',
      errorMsg: 'Missing recipient email address.',
      orderId,
      userId,
    });
    return { success: false, message: 'Email skipped: missing recipient.' };
  }

  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'no-reply@dineflow.app';

  if (sendgridApiKey) {
    const payload = JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: { email: fromEmail, name: 'DineFlow' },
      subject,
      content: [
        { type: 'text/plain', value: text || '' },
        ...(html ? [{ type: 'text/html', value: html }] : []),
      ],
    });

    const options = {
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    try {
      await requestJson(options, payload);
      logNotification({
        eventType: 'EMAIL',
        recipient: to,
        status: 'SUCCESS',
        orderId,
        userId,
      });
      return { success: true, message: `Email queued to ${to} via SendGrid.` };
    } catch (error) {
      logNotification({
        eventType: 'EMAIL',
        recipient: to,
        status: 'FAILED',
        errorMsg: `SendGrid request failed: ${error.message}`,
        orderId,
        userId,
      });
      return { success: false, error: error.message };
    }
  }

  // Fallback logging when credentials are not configured
  logNotification({
    eventType: 'EMAIL',
    recipient: to,
    status: 'FALLBACK',
    errorMsg: `Provider config missing. Subject: ${subject}`,
    orderId,
    userId,
  });
  return { success: true, message: 'Logged email content because no provider configured.' };
};

const sendSms = async ({ to, body, orderId, userId }) => {
  if (!to) {
    logNotification({
      eventType: 'SMS',
      recipient: 'UNKNOWN',
      status: 'FAILED',
      errorMsg: 'Missing recipient phone number.',
      orderId,
      userId,
    });
    return { success: false, message: 'SMS skipped: missing recipient phone number.' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  // Normalize recipient phone number
  const formattedTo = formatToE164(to);
  console.log('[DEBUG] NotificationService SMS formatting:', { input: to, formatted: formattedTo });
  if (!formattedTo) {
    logNotification({
      eventType: 'SMS',
      recipient: to,
      status: 'FAILED',
      errorMsg: `Invalid phone after formatting. Original: ${to}`,
      orderId,
      userId,
    });
    return { success: false, message: 'SMS skipped: invalid recipient phone number.' };
  }

  if (accountSid && authToken && fromNumber) {
    const postData = querystring.stringify({
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
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    try {
      await requestJson(options, postData);
      logNotification({
        eventType: 'SMS',
        recipient: formattedTo,
        status: 'SUCCESS',
        orderId,
        userId,
      });
      return { success: true, message: `SMS queued to ${formattedTo} via Twilio.` };
    } catch (error) {
      logNotification({
        eventType: 'SMS',
        recipient: formattedTo,
        status: 'FAILED',
        errorMsg: `Original: ${to} | Twilio request failed: ${error.message}`,
        orderId,
        userId,
      });
      return { success: false, error: error.message };
    }
  }

  // Fallback logging when credentials are not configured
  logNotification({
    eventType: 'SMS',
    recipient: formattedTo || to,
    status: 'FALLBACK',
    errorMsg: `Provider config missing. Body: ${body}`,
    orderId,
    userId,
  });
  return { success: true, message: 'Logged SMS content because no provider configured.' };
};

const sendWelcomeEmail = async ({ to, name, userId }) => {
  const subject = 'Welcome to DineFlow';
  const text = `Hello ${name},

Welcome to DineFlow!

Your account has been created successfully.

You can now:
- Browse menu items
- Place orders
- Track your order history

Thank you for joining DineFlow.

Regards,
DineFlow Team`;

  return await sendEmail({ to, subject, text, userId });
};

module.exports = {
  sendEmail,
  sendSms,
  sendWelcomeEmail,
};
