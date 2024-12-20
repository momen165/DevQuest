const db = require('../config/database');
const { logAdminActivity } = require('../models/activity');

const checkAdminAccess = async (userId) => {
  try {
    const query = 'SELECT 1 FROM admins WHERE admin_id = $1';
    const result = await db.query(query, [userId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
};

const getAdminActivities = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
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
      LIMIT 50
    `;
    const { rows } = await db.query(query, [req.user.userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

const getSystemMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const queries = {
      totalUsers: 'SELECT COUNT(*) FROM users',
      activeCourses: 'SELECT COUNT(*) FROM course WHERE is_active = true',
      totalEnrollments: 'SELECT COUNT(*) FROM enrollment'
    };

    const results = await Promise.all(
      Object.entries(queries).map(async ([key, query]) => {
        const { rows } = await db.query(query);
        return { [key]: parseInt(rows[0].count) };
      })
    );

    res.status(200).json(Object.assign({}, ...results));
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

const getPerformanceMetrics = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
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
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
};

const addAdmin = async (req, res) => {
  console.log('Request body:', req.body); // Debug request
  const { userId } = req.body;

  try {
    // Check if requester is admin
    const isAdmin = await checkAdminAccess(req.user.userId);
    console.log('Admin check result:', isAdmin); // Debug admin check
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user exists
    const userCheck = await db.query('SELECT 1 FROM users WHERE user_id = $1', [userId]);
    if (userCheck.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add user as admin
    await db.query('INSERT INTO admins (admin_id) VALUES ($1) ON CONFLICT DO NOTHING', [userId]);

    // Log activity
    await db.query(
      `INSERT INTO admin_activity (admin_id, action_type, action_description) 
       VALUES ($1, 'Admin', $2)`,
      [req.user.userId, `Added user ${userId} as admin`]
    );

    res.status(200).json({ message: 'Admin added successfully' });
  } catch (error) {
    console.error('Detailed error:', error); // Debug error
    res.status(500).json({ error: 'Failed to add admin' });
  }
};

const toggleMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;

  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('UPDATE system_settings SET maintenance_mode = $1', [enabled]);
    
    await logAdminActivity(
      req.user.userId,
      'System',
      `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    );

    res.status(200).json({
      message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ error: 'Failed to toggle maintenance mode' });
  }
};

const getSystemSettings = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await db.query('SELECT maintenance_mode FROM system_settings LIMIT 1');
    res.status(200).json({
      maintenanceMode: rows[0]?.maintenance_mode || false
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
};

const checkAdminStatus = async (req, res) => {
  try {
    const isAdmin = await checkAdminAccess(req.user.userId);
    res.status(200).json({ isAdmin });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
};

module.exports = {
  getAdminActivities,
  getSystemMetrics,
  getPerformanceMetrics,
  addAdmin,
  toggleMaintenanceMode,
  getSystemSettings,
  checkAdminStatus
};
