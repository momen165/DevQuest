# Mailgun Webhook Setup for Email Support

## Overview

This guide explains how to configure Mailgun to forward incoming emails to DevQuest's support ticket system.

## 1. Mailgun Receiving Configuration

### Step 1: Set up Routes in Mailgun Dashboard

1. Go to [Mailgun Dashboard](https://app.mailgun.com) → Your Domain → Routes
2. Create a new route with these settings:
   - **Priority**: 0 (highest)
   - **Filter Expression**: `match_recipient("support@mail.dev-quest.me")`
   - **Actions**: `forward("https://your-server-domain.com/api/email-webhook")`
   - **Description**: "DevQuest Support Email Forwarding"

### Step 2: Webhook Security (Recommended)

Add webhook verification to ensure emails come from Mailgun:

```javascript
// Already implemented in email-webhook.routes.js
const crypto = require("crypto");

function verifyMailgunWebhook(signingKey, token, timestamp, signature) {
  const value = timestamp + token;
  const hash = crypto.createHmac("sha256", signingKey).update(value).digest("hex");
  return hash === signature;
}

// Use in webhook endpoint:
const isValid = verifyMailgunWebhook(
  process.env.MAILGUN_WEBHOOK_SIGNING_KEY,  // NOT MAILGUN_API_KEY!
  req.body.token,
  req.body.timestamp,
  req.body.signature
);
```

**Important**: Use `MAILGUN_WEBHOOK_SIGNING_KEY`, not `MAILGUN_API_KEY` for webhook verification!

## 2. Environment Variables

Add these to your `server/.env` file:

```env
# Mailgun API configuration (for sending emails)
MAILGUN_API_KEY=your-api-key-here
MAILGUN_DOMAIN=mail.dev-quest.me
MAILGUN_API_URL=https://api.eu.mailgun.net

# Mailgun webhook security (for receiving emails)
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key-here
```

**Where to find these values:**
- `MAILGUN_API_KEY`: Mailgun Dashboard → Settings → API Keys → Private API key
- `MAILGUN_WEBHOOK_SIGNING_KEY`: Mailgun Dashboard → Settings → Webhooks → HTTP webhook signing key
- `MAILGUN_DOMAIN`: Your verified domain in Mailgun
- `MAILGUN_API_URL`: Use `https://api.eu.mailgun.net` for EU region, `https://api.mailgun.net` for US

## 3. DNS Configuration

### MX Records

Set up MX records for your domain to receive emails:

```
Type: MX
Name: @ (or your subdomain)
Value: mxa.mailgun.org
Priority: 10

Type: MX
Name: @ (or your subdomain)
Value: mxb.mailgun.org
Priority: 10
```

### SPF Record

Add SPF record for email authentication:

```
Type: TXT
Name: @
Value: "v=spf1 include:mailgun.org ~all"
```

## 3. Current Webhook Data Structure

The webhook receives this data structure from Mailgun:

```javascript
{
  "sender": "user@example.com",           // Who sent the email
  "recipient": "support@mail.dev-quest.me",  // Where it was sent
  "subject": "Re: DevQuest Support - Reply to Ticket #123",
  "body-plain": "This is my reply text...",
  "body-html": "<p>This is my reply...</p>",
  "stripped-text": "Clean reply without signatures",
  "timestamp": "1629825600",
  "token": "verification-token",
  "signature": "webhook-signature"
}
```

## 4. Email Reply Format

When admins reply to tickets, the system sends emails with this subject format:

```
"DevQuest Support - New Reply to Ticket #123"
```

When users reply via email, they should keep the ticket number in the subject line for proper threading.

## 5. Current Features

✅ **Automatic Ticket Creation**: New emails without ticket IDs create new tickets
✅ **Reply Threading**: Emails with ticket IDs add to existing conversations  
✅ **Email Verification**: Only ticket owners can reply via email
✅ **Ticket Reopening**: Closed tickets reopen when users reply
✅ **Content Cleaning**: Removes email signatures and quoted replies
✅ **Email Notifications**: Admins get notified of new email tickets

## 6. Testing the Webhook

You can test the webhook using curl:

```bash
curl -X POST https://your-server.com/api/email-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "test@example.com",
    "subject": "Test Support Request",
    "body-plain": "This is a test message"
  }'
```

## 7. Troubleshooting

### Common Issues:

1. **Webhook not receiving emails**: Check Mailgun routes configuration
2. **403 errors**: Verify webhook URL is accessible publicly
3. **Emails not threading**: Ensure subject line contains ticket ID (#123)
4. **Missing emails**: Check Mailgun logs in dashboard

### Debugging:

- Monitor server logs for webhook calls
- Check Mailgun dashboard for delivery attempts
- Verify DNS records are properly configured
- Test webhook endpoint directly with curl

## 9. Production Checklist

- [ ] Mailgun routes configured
- [ ] DNS MX records set up
- [ ] Webhook URL accessible publicly
- [ ] SSL certificate valid
- [ ] Webhook verification implemented
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Test emails sent and received
