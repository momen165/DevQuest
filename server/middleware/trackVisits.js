const prisma = require("../config/prisma");
const geoip = require("geoip-lite2");
const UAParser = require("ua-parser-js");

const trackVisit = async (req, res, next) => {
  try {
    // Only log real page visits (not API calls or assets)
    const accept = req.headers["accept"] || "";
    if (
      !accept.includes("text/html") ||
      req.path.includes(".") ||
      req.path === "/favicon.ico" ||
      req.path === "/health" ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/admin/analytics") ||
      req.path.startsWith("/getCoursesWithRatings")
    ) {
      return next();
    }

    // Get the real client IP (handle x-forwarded-for with multiple IPs)
    let ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "0.0.0.0";
    if (typeof ip === "string" && ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    const geo = geoip.lookup(ip);

    // Parse user agent for device info
    const parser = new UAParser(req.headers["user-agent"]);
    const uaResult = parser.getResult();

    // Determine device type
    let deviceType = "Other";
    if (uaResult.device.type === "mobile") deviceType = "Mobile";
    else if (uaResult.device.type === "tablet") deviceType = "Tablet";
    else if (!uaResult.device.type) deviceType = "Desktop";

    await prisma.site_visits.create({
      data: {
        user_id: req.user?.userId || null,
        ip_address: ip,
        page_visited: req.originalUrl || req.url,
        referrer: req.headers.referer || null,
        device_type: deviceType,
        browser: uaResult.browser.name || "Unknown",
        os: uaResult.os.name || "Unknown",
        country: geo?.country || null,
        city: geo?.city || null,
      },
    });

    // Support both user.userId and user.user_id for compatibility
    const userId = req.user?.userId || req.user?.user_id || null;
    if (userId) {
      // Run all 3 writes in parallel since they are independent
      await Promise.all([
        prisma.users.update({
          where: { user_id: userId },
          data: { last_login: new Date() },
        }),
        prisma.user_activity.create({
          data: {
            user_id: userId,
            action_type: req.method === "GET" ? "page_view" : "api_call",
            resource_id: null,
          },
        }),
      ]);
    }
  } catch (err) {
    console.error("Error tracking visit:", err);
    // Don't block the request if tracking fails
  }

  next();
};

module.exports = trackVisit;
