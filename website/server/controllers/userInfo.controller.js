const db = require('../config/database'); // Import your database connection

const getUserInfo = async (req, res) => {
  try {
    // Ensure the user ID is available in the request
    const userId = req.user?.userId;
    if (!userId) {
      console.error('Missing user ID.');
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    // Query to fetch user information
    const query = `
      SELECT 
        name AS username, 
        COALESCE(profileimage, '/default-profile-pic.png') AS profile_image
      FROM users 
      WHERE user_id = $1;
    `;
    const { rows } = await db.query(query, [userId]);

    if (rows.length === 0) {
      console.error(`User with ID ${userId} not found.`);
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = rows[0];
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user info:', error.stack);
    res.status(500).json({ error: 'Failed to fetch user info.' });
  }
};

module.exports = { getUserInfo };
