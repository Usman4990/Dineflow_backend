const { formatToE164 } = require('./phoneFormatter');

//DEBUG START
console.log("EMAIL MODULE ACTIVE");
console.log(process.env.SENDGRID_API_KEY ? "KEY OK" : "KEY MISSING");
// DEBUG END
const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

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

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to DineFlow</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
            color: #1f2937;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #f3f4f6;
          }
          .header {
            background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
            padding: 32px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 32px;
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin-top: 0;
            color: #111827;
          }
          p {
            font-size: 16px;
            line-height: 1.6;
            color: #4b5563;
          }
          .features {
            margin: 24px 0;
            padding: 0;
            list-style: none;
          }
          .features li {
            font-size: 15px;
            margin-bottom: 12px;
            color: #4b5563;
            display: flex;
            align-items: center;
          }
          .features li::before {
            content: "✓";
            color: #ea580c;
            font-weight: bold;
            margin-right: 10px;
            font-size: 16px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px 32px;
            text-align: center;
            font-size: 13px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DineFlow</div>
          </div>
          <div class="content">
            <h1>Welcome to DineFlow, ${name}!</h1>
            <p>We are absolutely thrilled to welcome you to our community. DineFlow is designed to make your dining experience smooth, quick, and delightful.</p>
            <p>Here is what you can do next with your new account:</p>
            <ul class="features">
              <li>Explore our rich and delicious menu options</li>
              <li>Add items to your cart and place orders instantly</li>
              <li>Track your delivery or pickup status in real-time</li>
              <li>Rate and review your meals to help us improve</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated welcome email from DineFlow. Please do not reply directly to this message.</p>
            <p>&copy; 2026 DineFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({ to, subject, text, html, userId });
};

const sendOtpEmail = async ({ to, otp, expiresInMinutes = 10 }) => {
  const subject = 'DineFlow Login Verification';
  const text = `Your DineFlow Login Verification OTP is: ${otp}. This OTP will expire in ${expiresInMinutes} minutes. For security, do not share this code.`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DineFlow Login Verification</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
            color: #1f2937;
          }
          .container {
            max-width: 500px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #f3f4f6;
          }
          .header {
            background: linear-gradient(135deg, #f97316 0%, #fbbf24 100%);
            padding: 24px;
            text-align: center;
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 32px;
            text-align: center;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            color: #111827;
          }
          p {
            font-size: 15px;
            line-height: 1.6;
            color: #4b5563;
          }
          .otp-card {
            background-color: #fff7ed;
            border: 1px dashed #fdba74;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            letter-spacing: 6px;
            font-size: 32px;
            font-weight: 800;
            color: #ea580c;
          }
          .expiry-text {
            font-size: 13px;
            color: #ef4444;
            font-weight: 600;
          }
          .security-note {
            font-size: 13px;
            color: #9ca3af;
            background-color: #f9fafb;
            padding: 12px;
            border-radius: 8px;
            margin-top: 24px;
          }
          .footer {
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af;
            border-top: 1px solid #f3f4f6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DineFlow</div>
          </div>
          <div class="content">
            <h1>Login Verification</h1>
            <p>Please use the following One-Time Password (OTP) to securely log in to your DineFlow account.</p>
            <div class="otp-card">${otp}</div>
            <p class="expiry-text">This code will expire in ${expiresInMinutes} minutes.</p>
            <div class="security-note">
              <strong>Security Note:</strong> If you did not request this login code, please ignore this email or secure your account password. Do not share this OTP with anyone.
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2026 DineFlow. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail({ to, subject, text, html });
};

module.exports = {
  sendEmail,
  sendSms,
  sendWelcomeEmail,
  sendOtpEmail,
};
