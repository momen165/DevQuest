/**
 * Professional Email Templates for DevQuest Support
 * HTML templates for consistent branding and formatting
 */

const BRAND_COLORS = {
  primary: "#1976d2",
  secondary: "#42a5f5",
  accent: "#ff6b35",
  success: "#4caf50",
  warning: "#ff9800",
  background: "#f5f5f5",
};

const EMAIL_STYLES = `
  <style>
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: ${BRAND_COLORS.background};
      padding: 20px;
    }
    .email-header {
      background: linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary});
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .email-logo {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .email-tagline {
      font-size: 14px;
      opacity: 0.9;
    }
    .email-content {
      background: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .ticket-info {
      background: ${BRAND_COLORS.background};
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid ${BRAND_COLORS.primary};
    }
    .button {
      display: inline-block;
      background: ${BRAND_COLORS.primary};
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 15px 0;
      font-weight: bold;
    }
    .button:hover {
      background: ${BRAND_COLORS.secondary};
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 12px;
      color: #666;
    }
    .help-links {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .help-links h4 {
      margin-top: 0;
      color: ${BRAND_COLORS.primary};
    }
    .help-links a {
      color: ${BRAND_COLORS.primary};
      text-decoration: none;
      display: block;
      margin: 5px 0;
    }
  </style>
`;

/**
 * Generate welcome/acknowledgment email template
 */
function generateWelcomeTemplate(ticketId, category, userMessage) {
  const categoryInfo = {
    billing: {
      title: "Billing & Payment Support",
      description:
        "Our billing specialists will review your account and respond within 24 hours.",
      icon: "💳",
    },
    technical: {
      title: "Technical Support",
      description:
        "Our technical team will investigate this issue and get back to you within 48 hours.",
      icon: "🔧",
    },
    course: {
      title: "Course & Learning Support",
      description:
        "Our education team will help you with course-related questions within 24 hours.",
      icon: "📚",
    },
    general: {
      title: "General Support",
      description:
        "We've received your message and will respond within 24-48 hours.",
      icon: "💬",
    },
  };

  const info = categoryInfo[category] || categoryInfo.general;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DevQuest Support - Ticket #${ticketId}</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="email-logo">DevQuest</div>
          <div class="email-tagline">Your coding journey, our support</div>
        </div>
        
        <div class="email-content">
          <h2>${info.icon} Thank you for contacting DevQuest Support!</h2>
          
          <div class="ticket-info">
            <strong>Ticket ID:</strong> #${ticketId}<br>
            <strong>Category:</strong> ${info.title}<br>
            <strong>Status:</strong> Open & Under Review
          </div>
          
          <p>Hi there!</p>
          
          <p>We've successfully received your message and created support ticket <strong>#${ticketId}</strong>. ${
            info.description
          }</p>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 3px solid ${
            BRAND_COLORS.accent
          };">
            <strong>Your Message:</strong><br>
            <em>${userMessage.substring(0, 200)}${
              userMessage.length > 200 ? "..." : ""
            }</em>
          </div>
          
          <a href="https://dev-quest.me/support/ticket/${ticketId}" class="button">
            View Ticket Status
          </a>
          
          <div class="help-links">
            <h4>Quick Help Resources</h4>
            <a href="https://dev-quest.me/help/faq">📋 Frequently Asked Questions</a>
            <a href="https://dev-quest.me/help/getting-started">🚀 Getting Started Guide</a>
            <a href="https://dev-quest.me/community">💬 Community Forum</a>
            <a href="https://dev-quest.me/help/contact">📧 Contact Options</a>
          </div>
          
          <p><strong>Need urgent help?</strong> If this is a critical issue affecting your learning, please reply to this email with "URGENT" in the subject line.</p>
          
          <p>Best regards,<br>
          <strong>The DevQuest Support Team</strong></p>
        </div>
        
        <div class="footer">
          <p>DevQuest - Empowering developers worldwide</p>
          <p>This email was sent regarding ticket #${ticketId}. Please keep this number for reference.</p>
          <p><a href="https://dev-quest.me/unsubscribe">Unsubscribe</a> | <a href="https://dev-quest.me/privacy">Privacy Policy</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate admin response template
 */
function generateAdminResponseTemplate(
  ticketId,
  adminName,
  responseMessage,
  userEmail,
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DevQuest Support Response - Ticket #${ticketId}</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="email-logo">DevQuest</div>
          <div class="email-tagline">Support Response</div>
        </div>
        
        <div class="email-content">
          <h2>📧 Response to your support ticket</h2>
          
          <div class="ticket-info">
            <strong>Ticket ID:</strong> #${ticketId}<br>
            <strong>Support Agent:</strong> ${adminName}<br>
            <strong>Response Time:</strong> ${new Date().toLocaleString()}
          </div>
          
          <p>Hello!</p>
          
          <p>We have an update on your support ticket <strong>#${ticketId}</strong>:</p>
          
          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e0e0e0;">
            ${responseMessage.replace(/\n/g, "<br>")}
          </div>
          
          <a href="https://dev-quest.me/support/ticket/${ticketId}" class="button">
            View Full Conversation
          </a>
          
          <p><strong>Need to reply?</strong> Simply respond to this email and your message will be automatically added to ticket #${ticketId}.</p>
          
          <div class="help-links">
            <h4>Still need help?</h4>
            <a href="https://dev-quest.me/help">📚 Help Center</a>
            <a href="https://dev-quest.me/community">💬 Community Support</a>
            <a href="https://dev-quest.me/support/new">🎫 Create New Ticket</a>
          </div>
          
          <p>Thank you for choosing DevQuest!</p>
          
          <p>Best regards,<br>
          <strong>${adminName}</strong><br>
          DevQuest Support Team</p>
        </div>
        
        <div class="footer">
          <p>DevQuest - Your coding education platform</p>
          <p>This email was sent to ${userEmail} regarding ticket #${ticketId}</p>
          <p><a href="https://dev-quest.me/unsubscribe">Unsubscribe</a> | <a href="https://dev-quest.me/privacy">Privacy Policy</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate ticket resolved template
 */
function generateResolvedTemplate(
  ticketId,
  resolutionMessage,
  satisfactionSurveyUrl,
) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DevQuest Support - Ticket #${ticketId} Resolved</title>
      ${EMAIL_STYLES}
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <div class="email-logo">DevQuest</div>
          <div class="email-tagline">Issue Resolved</div>
        </div>
        
        <div class="email-content">
          <h2>✅ Your support ticket has been resolved</h2>
          
          <div class="ticket-info">
            <strong>Ticket ID:</strong> #${ticketId}<br>
            <strong>Status:</strong> Resolved<br>
            <strong>Resolution Date:</strong> ${new Date().toLocaleString()}
          </div>
          
          <p>Great news! We've successfully resolved your support ticket <strong>#${ticketId}</strong>.</p>
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${
            BRAND_COLORS.success
          };">
            <strong>Resolution Summary:</strong><br>
            ${resolutionMessage.replace(/\n/g, "<br>")}
          </div>
          
          <p><strong>Was this helpful?</strong> We'd love to hear about your experience!</p>
          
          <a href="${satisfactionSurveyUrl}" class="button" style="background: ${
            BRAND_COLORS.success
          };">
            ⭐ Rate Our Support (2 minutes)
          </a>
          
          <p><strong>Need more help?</strong> If you have any follow-up questions, simply reply to this email and we'll reopen your ticket.</p>
          
          <div class="help-links">
            <h4>Continue Your Learning Journey</h4>
            <a href="https://dev-quest.me/courses">🎓 Browse Courses</a>
            <a href="https://dev-quest.me/community">💬 Join Community Discussions</a>
            <a href="https://dev-quest.me/blog">📖 Read Latest Articles</a>
            <a href="https://dev-quest.me/challenges">🏆 Take Coding Challenges</a>
          </div>
          
          <p>Thank you for being part of the DevQuest community!</p>
          
          <p>Best regards,<br>
          <strong>The DevQuest Support Team</strong></p>
        </div>
        
        <div class="footer">
          <p>DevQuest - Empowering your coding journey</p>
          <p>Ticket #${ticketId} has been marked as resolved. You can always contact us for more help!</p>
          <p><a href="https://dev-quest.me/unsubscribe">Unsubscribe</a> | <a href="https://dev-quest.me/privacy">Privacy Policy</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = {
  generateWelcomeTemplate,
  generateAdminResponseTemplate,
  generateResolvedTemplate,
  BRAND_COLORS,
};
