/**
 * Support Analytics System
 * Advanced analytics for email support ticket management
 */

const prisma = require("../config/prisma");
const { asyncHandler, AppError } = require("../utils/error.utils");

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get dashboard analytics data
 */
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  if (!req.user?.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const since = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalTickets,
    overdueTickets,
    resolvedTickets,
    categoryBreakdownRaw,
    priorityBreakdownRaw,
    ticketsWithFirstAdminReply,
  ] = await Promise.all([
    prisma.support.count({
      where: {
        time_opened: { gte: since },
      },
    }),
    prisma.support.count({
      where: {
        sla_target: { lt: new Date() },
        status: "open",
      },
    }),
    prisma.support.count({
      where: {
        status: "closed",
        time_opened: { gte: since },
      },
    }),
    prisma.support.groupBy({
      by: ["category"],
      where: {
        time_opened: { gte: since },
      },
      _count: { category: true },
    }),
    prisma.support.groupBy({
      by: ["priority"],
      where: {
        time_opened: { gte: since },
      },
      _count: { priority: true },
    }),
    prisma.support.findMany({
      where: {
        time_opened: { gte: since },
      },
      select: {
        ticket_id: true,
        time_opened: true,
        ticket_messages: {
          where: {
            sender_type: "admin",
            is_auto_response: false,
          },
          orderBy: { sent_at: "asc" },
          take: 1,
          select: { sent_at: true },
        },
      },
    }),
  ]);

  const responseTimes = ticketsWithFirstAdminReply
    .map((ticket) => {
      const firstReply = ticket.ticket_messages[0]?.sent_at;
      if (!firstReply || !ticket.time_opened) return null;
      return (
        (new Date(firstReply).getTime() -
          new Date(ticket.time_opened).getTime()) /
        1000
      );
    })
    .filter((value) => value !== null && value >= 0);

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, value) => sum + value, 0) /
        responseTimes.length
      : 0;

  const priorityOrder = { high: 1, medium: 2, low: 3 };

  const analytics = {
    totalTickets,
    avgResponseTime,
    overdueTickets,
    resolvedTickets,
    categoryBreakdown: categoryBreakdownRaw.map((row) => ({
      name: row.category || "uncategorized",
      count: row._count.category,
    })),
    priorityBreakdown: priorityBreakdownRaw
      .map((row) => ({
        name: row.priority || "unspecified",
        count: row._count.priority,
      }))
      .sort((a, b) => {
        const left = priorityOrder[a.name] || 4;
        const right = priorityOrder[b.name] || 4;
        return left - right;
      }),
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

  const now = new Date();
  const tickets = await prisma.support.findMany({
    orderBy: { time_opened: "desc" },
    take: 20,
    select: {
      ticket_id: true,
      user_email: true,
      category: true,
      priority: true,
      status: true,
      time_opened: true,
      sla_target: true,
    },
  });

  const response = tickets.map((ticket) => ({
    ticket_id: ticket.ticket_id,
    user_email: ticket.user_email,
    category: ticket.category || "general",
    priority: ticket.priority || "medium",
    status: ticket.status,
    time_opened: ticket.time_opened,
    age_seconds: ticket.time_opened
      ? Math.max(
          0,
          Math.floor(
            (now.getTime() - new Date(ticket.time_opened).getTime()) / 1000,
          ),
        )
      : 0,
    is_overdue:
      Boolean(ticket.sla_target) &&
      new Date(ticket.sla_target).getTime() < now.getTime() &&
      ticket.status === "open",
  }));

  res.json(response);
});

/**
 * Daily ticket trends for last 30 days (not currently routed but exported for future use)
 */
const getTicketTrends = asyncHandler(async (req, res) => {
  if (!req.user?.admin) {
    throw new AppError("Access denied. Admins only.", 403);
  }

  const since = new Date(Date.now() - 30 * DAY_MS);

  const tickets = await prisma.support.findMany({
    where: {
      time_opened: { gt: since },
    },
    select: {
      time_opened: true,
      status: true,
    },
    orderBy: { time_opened: "asc" },
  });

  const trendsMap = new Map();

  for (const ticket of tickets) {
    if (!ticket.time_opened) continue;
    const dateKey = new Date(ticket.time_opened).toISOString().slice(0, 10);

    if (!trendsMap.has(dateKey)) {
      trendsMap.set(dateKey, {
        date: dateKey,
        new_tickets: 0,
        closed_tickets: 0,
        open_tickets: 0,
      });
    }

    const day = trendsMap.get(dateKey);
    day.new_tickets += 1;
    if (ticket.status === "closed") {
      day.closed_tickets += 1;
    }
    if (ticket.status === "open") {
      day.open_tickets += 1;
    }
  }

  const trends = Array.from(trendsMap.values()).sort((a, b) =>
    a.date > b.date ? 1 : -1,
  );

  const summary = {
    totalDays: trends.length,
    avgDailyTickets:
      trends.length > 0
        ? (
            trends.reduce((sum, day) => sum + day.new_tickets, 0) /
            trends.length
          ).toFixed(1)
        : 0,
  };

  res.json({
    trends,
    summary,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = {
  getDashboardAnalytics,
  getRecentTicketsForDashboard,
  getTicketTrends,
};
