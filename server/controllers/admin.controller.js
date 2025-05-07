const db = require("../config/database");
const { logAdminActivity } = require("../models/activity");

const checkAdminAccess = async (userId) => {
  try {
    const query = "SELECT 1 FROM admins WHERE admin_id = $1";
    const result = await db.query(query, [userId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("Error checking admin access:", error);
    return false;
  }
};

const getAdminActivities = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = `
      SELECT 
        activity_id,
        action_type as type,
        action_description as description,
        created_at
      FROM admin_activity
      WHERE admin_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const { rows } = await db.query(query, [req.user.userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

const getSystemMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const queries = {
      totalUsers: "SELECT COUNT(*) FROM users",
      activeCourses: "SELECT COUNT(*) FROM course WHERE is_active = true",
      totalEnrollments: "SELECT COUNT(*) FROM enrollment",
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const { rows } = await db.query(query);
        return { [key]: parseInt(rows[0].count) };
      })
    );

    res.status(200).json(Object.assign({}, ...results));
  } catch (error) {
    console.error("Error fetching system metrics:", error);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM lesson_progress WHERE completed = true) as completed_lessons,
        (SELECT COUNT(DISTINCT user_id) FROM user_activity 
         WHERE created_at > NOW() - INTERVAL '7 days') as active_users,
        (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))::integer 
         FROM lesson_progress WHERE completed = true) as avg_completion_time
    `;

    const { rows } = await db.query(query);
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
};

const addAdmin = async (req, res) => {
  console.log("Request body:", req.body); // Debug request
  const { userId } = req.body;

  try {
    // Check if requester is admin
    const isAdmin = await checkAdminAccess(req.user.userId);
    console.log("Admin check result:", isAdmin); // Debug admin check
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if user exists
    const userCheck = await db.query("SELECT 1 FROM users WHERE user_id = $1", [
      userId,
    ]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is already an admin
    const adminCheck = await db.query(
      "SELECT 1 FROM admins WHERE admin_id = $1",
      [userId]
    );
    if (adminCheck.rowCount > 0) {
      // Get names for both admins
      const [requesterInfo, targetInfo] = await Promise.all([
        db.query("SELECT name FROM users WHERE user_id = $1", [req.user.userId]),
        db.query("SELECT name FROM users WHERE user_id = $1", [userId])
      ]);
      
      const requesterName = requesterInfo.rows[0]?.name || "Unknown";
      const targetName = targetInfo.rows[0]?.name || "Unknown";
      
      // Log the attempt with detailed information
      await logAdminActivity(
        req.user.userId,
        "Admin",
        `Admin ${requesterName} (ID: ${req.user.userId}) attempted to add user ${targetName} (ID: ${userId}) as admin but they are already an admin`
      );
      return res.status(400).json({ error: "User is already an admin" });
    }

    // Add user as admin
    await db.query("INSERT INTO admins (admin_id) VALUES ($1)", [userId]);

    // Get names for both users involved
    const [requesterInfo, targetInfo] = await Promise.all([
      db.query("SELECT name FROM users WHERE user_id = $1", [req.user.userId]),
      db.query("SELECT name FROM users WHERE user_id = $1", [userId])
    ]);
    
    const requesterName = requesterInfo.rows[0]?.name || "Unknown";
    const targetName = targetInfo.rows[0]?.name || "Unknown";

    // Log successful addition
    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) added user ${targetName} (ID: ${userId}) as admin`
    );

    res.status(200).json({ message: "Admin added successfully" });
  } catch (error) {
    console.error("Detailed error:", error); // Debug error
    res.status(500).json({ error: "Failed to add admin" });
  }
};

const removeAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prevent removing self
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: "Cannot remove yourself as admin" });
    }

    // Check if user exists and is an admin
    const adminCheck = await db.query(
      "SELECT 1 FROM admins WHERE admin_id = $1",
      [userId]
    );
    if (adminCheck.rowCount === 0) {
      return res.status(404).json({ error: "User is not an admin" });
    }

    // Remove admin
    await db.query("DELETE FROM admins WHERE admin_id = $1", [userId]);

    // Get names for both users involved
    const [requesterInfo, targetInfo] = await Promise.all([
      db.query("SELECT name FROM users WHERE user_id = $1", [req.user.userId]),
      db.query("SELECT name FROM users WHERE user_id = $1", [userId])
    ]);
    
    const requesterName = requesterInfo.rows[0]?.name || "Unknown";
    const targetName = targetInfo.rows[0]?.name || "Unknown";

    // Log activity
    await logAdminActivity(
      req.user.userId,
      "Admin",
      `Admin ${requesterName} (ID: ${req.user.userId}) removed user ${targetName} (ID: ${userId}) from admin role`
    );

    res.status(200).json({ message: "Admin removed successfully" });
  } catch (error) {
    console.error("Error removing admin:", error);
    res.status(500).json({ error: "Failed to remove admin" });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { enabled } = req.body;

    // Update maintenance mode using your schema
    const query = `
      INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
      VALUES (1, $1, CURRENT_TIMESTAMP, $2)
      ON CONFLICT (setting_id) DO UPDATE 
      SET maintenance_mode = $1, 
          updated_at = CURRENT_TIMESTAMP,
          updated_by = $2
      RETURNING maintenance_mode`;

    const { rows } = await db.query(query, [enabled, req.user.userId]);

    await logAdminActivity(
      req.user.userId,
      "System",
      `Maintenance mode ${enabled ? "enabled" : "disabled"}`
    );

    res.status(200).json({
      maintenanceMode: rows[0].maintenance_mode,
      message: `Maintenance mode ${enabled ? "enabled" : "disabled"}`,
    });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json({ error: "Failed to toggle maintenance mode" });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get settings using your schema
    const query = `
      INSERT INTO system_settings (setting_id, maintenance_mode, updated_at, updated_by) 
      VALUES (1, false, CURRENT_TIMESTAMP, $1)
      ON CONFLICT (setting_id) DO UPDATE 
      SET setting_id = system_settings.setting_id
      RETURNING maintenance_mode, updated_at, updated_by`;

    const { rows } = await db.query(query, [req.user.userId]);

    res.status(200).json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      updatedAt: rows[0]?.updated_at,
      updatedBy: rows[0]?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
};

const checkAdminStatus = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    res.status(200).json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ error: "Failed to check admin status" });
  }
};

const getMaintenanceStatus = async (req, res) => {
  try {
    // This is a public endpoint, so we don't need to check for admin access
    const query = `
      SELECT maintenance_mode, updated_at, updated_by 
      FROM system_settings 
      WHERE setting_id = 1`;

    const { rows } = await db.query(query);

    // Add Cache-Control headers to prevent browsers from caching the response
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");

    res.status(200).json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      updatedAt: rows[0]?.updated_at,
      updatedBy: rows[0]?.updated_by,
    });
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    res.status(500).json({ error: "Failed to fetch maintenance status" });
  }
};

module.exports = {
  getAdminActivities,
  getSystemMetrics,
  getPerformanceMetrics,
  addAdmin,
  removeAdmin,
  toggleMaintenanceMode,
  getSystemSettings,
  checkAdminStatus,
  getMaintenanceStatus,
};
