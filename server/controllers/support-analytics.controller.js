/**
 * Support Analytics System
 * Advanced analytics for email support ticket management
 */

const db = require("../config/database");
const { asyncHandler, AppError } = require("../utils/error.utils");

/**
 * Get dashboard analytics data
 */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  if (!req.user?.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const [
    totalTicketsResult,
    avgResponseTimeResult,
    overdueTicketsResult,
    resolvedTicketsResult,
    categoryBreakdownResult,
    priorityBreakdownResult,
  ] = await Promise.all([
    // Total tickets in last 30 days
    db.query(`
      SELECT COUNT(*) as total_tickets 
      FROM support 
      WHERE time_opened >= NOW() - INTERVAL '30 days'
    `),
    // Average first admin (non-auto) response time in seconds
    db.query(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (first_admin_reply.sent_at - s.time_opened))) as avg_response_seconds
      FROM support s
      JOIN (
        SELECT ticket_id, MIN(sent_at) as sent_at
        FROM ticket_messages 
        WHERE sender_type = 'admin' AND is_auto_response = FALSE
        GROUP BY ticket_id
      ) first_admin_reply ON s.ticket_id = first_admin_reply.ticket_id
      WHERE s.time_opened >= NOW() - INTERVAL '30 days'
    `),
    // Overdue tickets (open & past SLA target)
    db.query(`
      SELECT COUNT(*) as overdue_count
      FROM support 
      WHERE sla_target < NOW() AND status = 'open'
    `),
    // Resolved tickets last 30 days
    db.query(`
      SELECT COUNT(*) as resolved_count 
      FROM support 
      WHERE status = 'closed' AND time_opened >= NOW() - INTERVAL '30 days'
    `),
    // Category breakdown
    db.query(`
      SELECT category, COUNT(*) as count
      FROM support 
      WHERE time_opened >= NOW() - INTERVAL '30 days'
      GROUP BY category
      ORDER BY count DESC
    `),
    // Priority breakdown
    db.query(`
      SELECT priority, COUNT(*) as count
      FROM support 
      WHERE time_opened >= NOW() - INTERVAL '30 days'
      GROUP BY priority
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END
    `),
  ]);

  const analytics = {
    totalTickets: parseInt(totalTicketsResult.rows[0]?.total_tickets || 0),
    avgResponseTime: parseFloat(
      avgResponseTimeResult.rows[0]?.avg_response_seconds || 0
    ),
    overdueTickets: parseInt(overdueTicketsResult.rows[0]?.overdue_count || 0),
    resolvedTickets: parseInt(
      resolvedTicketsResult.rows[0]?.resolved_count || 0
    ),
    categoryBreakdown: categoryBreakdownResult.rows.map((row) => ({
      name: row.category || "uncategorized",
      count: parseInt(row.count),
    })),
    priorityBreakdown: priorityBreakdownResult.rows.map((row) => ({
      name: row.priority || "unspecified",
      count: parseInt(row.count),
    })),
    generatedAt: new Date().toISOString(),
  };

  res.json(analytics);
});

/**
 * Get recent tickets for dashboard display
 */
const getRecentTicketsForDashboard = asyncHandler(async (req, res) => {
  if (!req.user?.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const result = await db.query(`
    SELECT 
      ticket_id,
      user_email,
      category,
      priority,
      status,
      time_opened,
      sla_target,
      EXTRACT(EPOCH FROM (NOW() - time_opened)) as age_seconds,
      CASE 
        WHEN sla_target < NOW() AND status = 'open' THEN true 
        ELSE false 
      END as is_overdue
    FROM support 
    ORDER BY time_opened DESC 
    LIMIT 20
  `);

  const tickets = result.rows.map((ticket) => ({
    ticket_id: ticket.ticket_id,
    user_email: ticket.user_email,
    category: ticket.category || "general",
    priority: ticket.priority || "medium",
    status: ticket.status,
    time_opened: ticket.time_opened,
    age_seconds: parseInt(ticket.age_seconds),
    is_overdue: ticket.is_overdue,
  }));

  res.json(tickets);
});

/**
 * Daily ticket trends for last 30 days (not currently routed but exported for future use)
 */
const getTicketTrends = asyncHandler(async (req, res) => {
  if (!req.user?.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const trends = await db.query(`
    SELECT 
      DATE(time_opened) as date,
      COUNT(*) as new_tickets,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets
    FROM support 
    WHERE time_opened > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY DATE(time_opened)
    ORDER BY date
  `);

  const summary = {
    totalDays: trends.rows.length,
    avgDailyTickets:
      trends.rows.length > 0
        ? (
            trends.rows.reduce(
              (sum, day) => sum + parseInt(day.new_tickets),
              0
            ) / trends.rows.length
          ).toFixed(1)
        : 0,
  };

  res.json({
    trends: trends.rows,
    summary,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = {
  getDashboardAnalytics,
  getRecentTicketsForDashboard,
  getTicketTrends,
};
