const express = require("express");
const router = express.Router();
const db = require("../config/database");
const geoip = require("geoip-lite");
const UAParser = require("ua-parser-js");

// POST /api/track-pageview
router.post("/track-pageview", async (req, res) => {
  try {
    const { path } = req.body;
    // Filter out empty, root, or obviously invalid paths
    if (
      !path ||
      typeof path !== "string" ||
      path === "/" ||
      path.trim() === ""
    ) {
      return res.status(204).end();
    }

    // Get the real client IP (handle x-forwarded-for with multiple IPs)
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
    // Log for debugging
    console.log(
      "[Analytics] Tracking pageview:",
      path,
      "| IP:",
      ip,
      "| UA:",
      req.headers["user-agent"]
    );

    // Get geo-location info from IP (if available)
    const geo = geoip.lookup(ip);

    // Parse user agent for device info
    const parser = new UAParser(req.headers["user-agent"]);
    const uaResult = parser.getResult();

    // Determine device type
    let deviceType = "Other";
    if (uaResult.device.type === "mobile") deviceType = "Mobile";
    else if (uaResult.device.type === "tablet") deviceType = "Tablet";
    else if (!uaResult.device.type) deviceType = "Desktop";

    // Insert visit data
    const query = `
      INSERT INTO site_visits 
        (user_id, ip_address, visit_date, page_visited, referrer, device_type, browser, os, country, city)
      VALUES
        ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, $7, $8, $9)
    `;

    await db.query(query, [
      req.user?.userId || null,
      ip,
      path,
      req.headers.referer || null,
      deviceType,
      uaResult.browser.name || "Unknown",
      uaResult.os.name || "Unknown",
      geo && geo.country ? geo.country : null,
      geo && geo.city ? geo.city : null,
    ]);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error tracking pageview:", err);
    res.status(500).json({ error: "Failed to track pageview" });
  }
});

module.exports = router;
