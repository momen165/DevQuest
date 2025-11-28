/**
 * Automated Response System
 * Smart auto-replies and ticket routing
 */

const { sendNotificationEmail } = require("./email.utils");

// Common support categories and auto-responses
const AUTO_RESPONSES = {
  billing: {
    keywords: [
      "payment",
      "billing",
      "subscription",
      "charge",
      "refund",
      "invoice",
    ],
    response: `Thank you for contacting DevQuest support regarding billing!

We've received your inquiry and will review your account within 24 hours. For urgent billing matters, please include your subscription email and order number.

Common billing resources:
• Subscription Management: https://dev-quest.me/account/subscription
• Billing FAQ: https://dev-quest.me/help/billing
• Refund Policy: https://dev-quest.me/terms/refund

Best regards,
DevQuest Support Team`,
    priority: "high",
  },

  technical: {
    keywords: [
      "error",
      "bug",
      "broken",
      "not working",
      "crash",
      "loading",
      "login",
    ],
    response: `Hi there!

Thanks for reporting this technical issue. We'll investigate and get back to you within 48 hours.

To help us resolve this faster, please include:
• What browser/device you're using
• Steps to reproduce the issue
• Any error messages you see

You can also check our status page: https://dev-quest.me/status

DevQuest Technical Support`,
    priority: "medium",
  },

  course: {
    keywords: ["course", "lesson", "content", "video", "exercise", "progress"],
    response: `Hello!

Thank you for your question about DevQuest course content. Our education team will review your inquiry and respond within 24 hours.

Helpful resources while you wait:
• Course Help Center: https://dev-quest.me/help/courses
• Community Forum: https://dev-quest.me/community
• Study Tips: https://dev-quest.me/blog/study-tips

Happy coding!
DevQuest Education Team`,
    priority: "medium",
  },

  general: {
    keywords: ["hello", "help", "question", "info", "contact"],
    response: `Hello and welcome to DevQuest!

We've received your message and will respond within 24-48 hours. 

Quick links that might help:
• Getting Started Guide: https://dev-quest.me/help/getting-started
• FAQ: https://dev-quest.me/help/faq
• Course Catalog: https://dev-quest.me/courses

Thank you for choosing DevQuest!
Support Team`,
    priority: "low",
  },
};

/**
 * Analyze ticket content and determine category
 */
function categorizeTicket(subject, message) {
  const content = `${subject} ${message}`.toLowerCase();

  for (const [category, config] of Object.entries(AUTO_RESPONSES)) {
    for (const keyword of config.keywords) {
      if (content.includes(keyword)) {
        return {
          category,
          confidence: calculateConfidence(content, config.keywords),
          autoResponse: config.response,
          priority: config.priority,
        };
      }
    }
  }

  return {
    category: "general",
    confidence: 0.5,
    autoResponse: AUTO_RESPONSES.general.response,
    priority: "low",
  };
}

/**
 * Calculate confidence score for categorization
 */
function calculateConfidence(content, keywords) {
  const matches = keywords.filter((keyword) => content.includes(keyword));
  return Math.min((matches.length / keywords.length) * 2, 1);
}

/**
 * Send automated acknowledgment response
 */
async function sendAutoResponse(ticketId, userEmail, category, autoResponse) {
  try {
    const subject = `Re: DevQuest Support Ticket #${ticketId} - We've Got Your Message!`;

    await sendNotificationEmail(userEmail, subject, autoResponse, {
      ticketId,
      category,
      isAutoResponse: true,
    });

    console.log(`Auto-response sent for ticket #${ticketId} (${category})`);
    return true;
  } catch (error) {
    console.error("Auto-response failed:", error);
    return false;
  }
}

/**
 * Smart ticket routing based on category and priority
 */
function routeTicket(category, priority) {
  const routes = {
    billing: {
      department: "billing",
      assignTo: "billing-team@mail.dev-quest.me",
      sla: priority === "high" ? "12h" : "24h",
    },
    technical: {
      department: "technical",
      assignTo: "tech-support@mail.dev-quest.me",
      sla: priority === "high" ? "24h" : "48h",
    },
    course: {
      department: "education",
      assignTo: "education@mail.dev-quest.me",
      sla: priority === "high" ? "12h" : "24h",
    },
    general: {
      department: "general",
      assignTo: "support@mail.dev-quest.me",
      sla: priority === "high" ? "24h" : "48h",
    },
  };

  return routes[category] || routes.general;
}

module.exports = {
  categorizeTicket,
  sendAutoResponse,
  routeTicket,
  AUTO_RESPONSES,
};
