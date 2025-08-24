# DevQuest Email Support System - Complete Guide

## 🎯 Overview

DevQuest has a comprehensive email support system that allows users to:

1. **Send support emails** to `support@dev-quest.tech`
2. **Receive automatic replies** via email
3. **Continue conversations** by replying to emails
4. **Admin management** through the web interface

---

## 📧 How Email Processing Works

### 1. **Incoming Email Flow**

```
User sends email to support@dev-quest.tech
           ↓
    Mailgun receives email
           ↓
  Mailgun forwards to webhook: /api/email-webhook
           ↓
    DevQuest processes email
           ↓
   Creates ticket OR adds to existing ticket
           ↓
    Sends auto-confirmation email to user
```

### 2. **Email Subject Processing**

- **New Tickets**: Any email without `#123` format creates a new ticket
- **Existing Tickets**: Emails with `Re: DevQuest Support - New Reply to Ticket #123` add to that ticket
- **Ticket Reopening**: Closed tickets automatically reopen when users reply

### 3. **Current Webhook Implementation**

**Location**: `server/routes/email-webhook.routes.js`

**Features**:

- ✅ Mailgun webhook verification
- ✅ Smart field detection (handles multiple Mailgun field formats)
- ✅ Ticket ID extraction from subject lines
- ✅ Email sender verification
- ✅ Content cleaning (removes signatures/quoted text)
- ✅ Automatic ticket creation and replies
- ✅ Comprehensive logging

---

## 🔧 Technical Implementation

### **Webhook Endpoint**

```
POST /api/email-webhook
```

### **Expected Mailgun Payload**

```javascript
{
  "sender": "user@example.com",
  "recipient": "support@dev-quest.tech",
  "subject": "Re: DevQuest Support - New Reply to Ticket #123",
  "body-plain": "Raw email content...",
  "stripped-text": "Clean email content without signatures...",
  "timestamp": "1629825600",
  "token": "webhook-verification-token",
  "signature": "webhook-signature-hash"
}
```

### **Processing Logic**

1. **Webhook Verification**: Validates request came from Mailgun
2. **Field Extraction**: Gets sender, subject, and content
3. **Ticket ID Detection**: Looks for `#123` pattern in subject
4. **Database Operations**: Creates/updates tickets and messages
5. **Response**: Returns success/error status

---

## 🛠️ Setup Requirements

### **1. Mailgun Configuration**

**Routes Setup** (in Mailgun Dashboard):

```
Priority: 0
Filter: match_recipient("support@dev-quest.tech")
Action: forward("https://your-server.com/api/email-webhook")
```

**DNS Records**:

```
MX: mxa.mailgun.org (Priority: 10)
MX: mxb.mailgun.org (Priority: 10)
TXT: "v=spf1 include:mailgun.org ~all"
```

### **2. Environment Variables**

```bash
MAILGUN_API_KEY=key-your-api-key
MAILGUN_DOMAIN=dev-quest.tech
SENDER_EMAIL_SUPPORT=support@dev-quest.tech
```

### **3. Server Requirements**

- Public HTTPS endpoint accessible to Mailgun
- Valid SSL certificate
- Webhook endpoint not behind authentication

---

## 🧪 Testing the System

### **Test Script**

Use the provided test script:

```bash
cd server/scripts
node test-email-webhook.js
```

### **Manual Testing**

1. Send email to `support@dev-quest.tech`
2. Check server logs for webhook processing
3. Verify ticket creation in admin dashboard
4. Reply to confirmation email
5. Check that reply is added to ticket

### **Debugging Tools**

- **Server Logs**: Monitor webhook processing
- **Mailgun Logs**: Check delivery in Mailgun dashboard
- **Database**: Query support and ticket_messages tables
- **Admin Dashboard**: View tickets through web interface

---

## 📊 Current Status

### **✅ Completed Features**

- Email receiving and processing
- Ticket creation from emails
- Reply threading by ticket ID
- Admin email notifications
- User email confirmations
- Webhook security verification
- Content cleaning and sanitization

### **🔄 Email Flow Integration**

- **Frontend**: Admin can view and reply to tickets
- **Backend**: Handles all email processing automatically
- **Database**: Stores conversations with proper threading
- **Notifications**: Bidirectional email communication

### **🎯 User Experience**

1. User emails `support@dev-quest.tech`
2. Gets immediate auto-reply with ticket ID
3. Can reply to emails to continue conversation
4. Admin replies via web interface
5. User receives admin replies via email
6. Complete email-based support workflow

---

## 🚀 Quick Start

1. **Configure Mailgun routes** (see setup guide)
2. **Set up DNS records** for email receiving
3. **Test webhook** with provided script
4. **Send test email** to verify end-to-end flow
5. **Monitor logs** and database for proper processing

The system is now fully operational and ready for production email support! 📧✨
