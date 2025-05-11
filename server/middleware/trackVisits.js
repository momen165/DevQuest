const db = require("../config/database");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

const trackVisit = async (req, res, next) => {
  try {
    // Only log real page visits (not API calls or assets):
    // - Accept header must include 'text/html'
    // - Path should not be an asset (skip ".", "/favicon.ico", "/health")
    // - Path should NOT start with /api or /admin/analytics or /getCoursesWithRatings
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
    // Remove IPv6 prefix if present
    if (typeof ip === "string" && ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    // Get geo-location info from IP (if available)
    const geo = geoip.lookup(ip);
    if (!geo || !geo.country) {
      console.warn(`[GeoIP] Could not resolve country for IP: ${ip}`);
    }

    // Parse user agent for device info
    const parser = new UAParser(req.headers["user-agent"]);
    const uaResult = parser.getResult();

    // Determine device type
    let deviceType = "Other";
    if (uaResult.device.type === "mobile") deviceType = "Mobile";
    else if (uaResult.device.type === "tablet") deviceType = "Tablet";
    else if (!uaResult.device.type) deviceType = "Desktop";
    // Insert visit data with enhanced tracking
    const query = `
      INSERT INTO site_visits 
        (user_id, ip_address, visit_date, page_visited, referrer, device_type, browser, os, country, city)
      VALUES
        ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9)
    `;

    await db.query(query, [
      req.user?.userId || null,
      ip,
      req.originalUrl || req.url,
      req.headers.referer || null,
      deviceType,
      uaResult.browser.name || "Unknown",
      uaResult.os.name || "Unknown",
      geo && geo.country ? geo.country : null,
      geo && geo.city ? geo.city : null,
    ]);

    // If this is a logged-in user, update the session information
    // Support both user.userId and user.user_id for compatibility
    const userId = req.user?.userId || req.user?.user_id || null;
    if (userId) {
      console.log(
        `[TrackVisits] Resolved userId:`,
        userId,
        "req.user:",
        req.user
      );
      // Always update last login time for active users metric
      const updateResult = await db.query(
        `
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE user_id = $1
        RETURNING user_id, last_login
      `,
        [userId]
      );
      if (updateResult.rowCount === 0) {
        console.warn(`[TrackVisits] No user found for userId:`, userId);
      } else {
        console.log(
          `[TrackVisits] Updated last_login for userId:`,
          userId,
          "at",
          updateResult.rows[0].last_login
        );
      }

      // Track session information
      const sessionQuery = `
        INSERT INTO user_activity (user_id, action_type, resource_id)
        VALUES ($1, $2, NULL)
      `;

      await db.query(sessionQuery, [
        userId,
        req.method === "GET" ? "page_view" : "api_call",
      ]);
    }
  } catch (err) {
    console.error("Error tracking visit:", err);
    // Don't block the request if tracking fails
  }

  next();
};

module.exports = trackVisit;
