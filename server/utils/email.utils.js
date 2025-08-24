const Mailgun = require("mailgun.js");
const formData = require("form-data");
require("dotenv").config();

// Initialize Mailgun client
const mailgun = new Mailgun(formData);

// Debug logging for configuration
console.log("Mailgun Configuration:");
console.log(
  "- API Key:",
  process.env.MAILGUN_API_KEY
    ? `${process.env.MAILGUN_API_KEY.substring(0, 10)}...`
    : "Not set"
);
console.log("- Domain:", process.env.MAILGUN_DOMAIN || "Not set");
console.log(
  "- API URL:",
  process.env.MAILGUN_API_URL || "https://api.mailgun.net (default)"
);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
  url: process.env.MAILGUN_API_URL || "https://api.mailgun.net", // Use EU endpoint if needed
});

// Email templates
const emailStyles = {
  container: `font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;`,
  header: `background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); padding: 40px 20px; text-align: center; color: white;`,
  contentArea: `padding: 40px 30px; background-color: #ffffff;`,
  footer: `background-color: #F9FAFB; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;`,
  button: `display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;`,
  replyBox: `background-color: #F8FAFC; border-left: 4px solid #6366F1; padding: 16px; margin: 20px 0; border-radius: 4px;`,
};

const getEmailTemplate = (content) => `
  <div style="${emailStyles.container}">
    <div style="${emailStyles.header}">
      <h1 style="margin: 0; font-size: 24px; font-weight: 700;">DevQuest Support</h1>
    </div>
    <div style="${emailStyles.contentArea}">
      ${content}
    </div>
    <div style="${emailStyles.footer}">
      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        This is a message from DevQuest Support.<br>
        <strong>You can reply directly to this email to continue the conversation.</strong>
      </p>
    </div>
  </div>
`;

const sendSupportReplyNotification = async (
  userEmail,
  ticketId,
  adminReply
) => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.warn("Mailgun configuration missing - skipping email notification");
    return false;
  }

  const subject = `DevQuest Support - New Reply to Ticket #${ticketId}`;

  const emailContent = getEmailTemplate(`
    <h2 style="color: #1F2937; font-size: 20px; margin-bottom: 16px;">New Reply to Your Support Ticket</h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hello! You have received a new reply to your support ticket <strong>#${ticketId}</strong>.
    </p>
    
    <div style="${emailStyles.replyBox}">
      <h3 style="color: #4F46E5; font-size: 16px; margin: 0 0 12px 0;">Admin Reply:</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${adminReply}</p>
    </div>
    
    <div style="background-color: #EEF2FF; border: 2px solid #6366F1; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
      <h3 style="color: #4F46E5; font-size: 18px; margin: 0 0 12px 0;">💬 Reply to Continue the Conversation</h3>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
        <strong>Simply reply to this email</strong> to send your response directly to our support team. 
        Your message will be automatically added to ticket #${ticketId}.
      </p>
    </div>
    
    <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
      <strong>Alternative contact:</strong> You can also email us directly at 
      <a href="mailto:${process.env.SENDER_EMAIL_SUPPORT}" style="color: #6366F1;">${process.env.SENDER_EMAIL_SUPPORT}</a>
    </p>
  `);

  const textContent = `New reply to your support ticket #${ticketId}

Admin Reply: ${adminReply}

Simply reply to this email to continue the conversation.

Alternative contact: ${process.env.SENDER_EMAIL_SUPPORT}`;

  try {
    const messageData = {
      from: `DevQuest Support <${
        process.env.SENDER_EMAIL_SUPPORT || process.env.SENDER_EMAIL
      }>`,
      to: userEmail,
      "h:Reply-To": `DevQuest Support Team <${
        process.env.SENDER_EMAIL_SUPPORT || process.env.SENDER_EMAIL
      }>`,
      subject: subject,
      html: emailContent,
      text: textContent,
      "o:tag": [`support-reply`, `ticket-${ticketId}`],
      "h:X-Support-Ticket-ID": ticketId.toString(),
      "h:X-Support-Type": "reply",
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      messageData
    );

    console.log(
      `Support reply notification sent successfully to ${userEmail} for ticket #${ticketId}. Message ID: ${response.id}`
    );
    return true;
  } catch (error) {
    console.error("Error sending support reply notification:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      details: error.details,
      response: error.response?.data || error.response,
    });
    return false;
  }
};

const sendSupportTicketConfirmation = async (userEmail, userName, ticketId) => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.warn("Mailgun configuration missing - skipping email notification");
    return false;
  }

  const subject = `DevQuest Support - Ticket #${ticketId} Created`;

  const emailContent = getEmailTemplate(`
    <h2 style="color: #1F2937; font-size: 20px; margin-bottom: 16px;">Support Ticket Created Successfully</h2>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      Hello ${userName}! Your support ticket has been created successfully.
    </p>
    
    <div style="${emailStyles.replyBox}">
      <h3 style="color: #4F46E5; font-size: 16px; margin: 0 0 12px 0;">Ticket Details:</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0;">
        <strong>Ticket ID:</strong> #${ticketId}<br>
        <strong>Status:</strong> Open<br>
        <strong>Expected Response Time:</strong> Within 24 hours
      </p>
    </div>
    
    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
      One of our administrators will review your message and respond as soon as possible. When we reply, you'll receive an email notification and can continue the conversation by simply replying to that email.
    </p>
    
    <div style="background-color: #EEF2FF; border: 2px solid #6366F1; padding: 20px; margin: 25px 0; border-radius: 8px; text-align: center;">
      <h3 style="color: #4F46E5; font-size: 18px; margin: 0 0 12px 0;">📧 How to Reply</h3>
      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
        When you receive our response, <strong>simply reply to that email</strong> to continue the conversation. 
        Your replies will be automatically added to ticket #${ticketId}.
      </p>
    </div>
    
    <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
      <strong>Need immediate assistance?</strong> Email us directly at 
      <a href="mailto:${process.env.SENDER_EMAIL_SUPPORT}" style="color: #6366F1;">${process.env.SENDER_EMAIL_SUPPORT}</a>
    </p>
  `);

  const textContent = `Support ticket #${ticketId} created successfully

Hello ${userName}! Your support ticket has been created.

Ticket ID: #${ticketId}
Status: Open
Expected Response Time: Within 24 hours

When we reply, simply respond to that email to continue the conversation.

Contact: ${process.env.SENDER_EMAIL_SUPPORT}`;

  try {
    const messageData = {
      from: `DevQuest Support <${
        process.env.SENDER_EMAIL_SUPPORT || process.env.SENDER_EMAIL
      }>`,
      to: `${userName} <${userEmail}>`,
      "h:Reply-To": `DevQuest Support Team <${
        process.env.SENDER_EMAIL_SUPPORT || process.env.SENDER_EMAIL
      }>`,
      subject: subject,
      html: emailContent,
      text: textContent,
      "o:tag": [`support-ticket`, `ticket-${ticketId}`],
      "h:X-Support-Ticket-ID": ticketId.toString(),
      "h:X-Support-Type": "confirmation",
    };

    const response = await mg.messages.create(
      process.env.MAILGUN_DOMAIN,
      messageData
    );

    console.log(
      `Support ticket confirmation sent successfully to ${userEmail} for ticket #${ticketId}. Message ID: ${response.id}`
    );
    return true;
  } catch (error) {
    console.error("Error sending support ticket confirmation:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      details: error.details,
      response: error.response?.data || error.response,
    });
    return false;
  }
};

module.exports = {
  sendSupportReplyNotification,
  sendSupportTicketConfirmation,
};
