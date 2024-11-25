const db = require('../config/database'); // Adjust path to your DB connection

// Add a subscription
const addSubscription = async (req, res) => {
  const { amount_paid } = req.body;
  const userId = req.user.userId;

  const subscriptionType = amount_paid === 20 ? 'Monthly' : 'Yearly';

  try {
    const subscriptionQuery = `
      INSERT INTO subscription (subscription_start_date, subscription_end_date, subscription_type, amount_paid, status)
      VALUES (
        CURRENT_DATE,
        CASE 
          WHEN $1 = 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
          WHEN $1 = 'Yearly' THEN CURRENT_DATE + INTERVAL '1 year'
        END,
        $1,
        $2,
        'Completed'
      )
      RETURNING subscription_id;
    `;
    const { rows: subscriptionRows } = await db.query(subscriptionQuery, [subscriptionType, amount_paid]);
    const subscriptionId = subscriptionRows[0].subscription_id;

    const userSubscriptionQuery = `
      INSERT INTO user_subscription (user_id, subscription_id)
      VALUES ($1, $2);
    `;
    await db.query(userSubscriptionQuery, [userId, subscriptionId]);

    res.status(201).json({ subscription_id: subscriptionId });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
};

// Get all subscriptions
const getSubscriptions = async (req, res) => {
  if (!req.user.admin) {
    console.error('Access denied: User is not an admin.');
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const query = `
      SELECT 
        s.subscription_id,
        u.name AS student_name,
        s.amount_paid,
        s.subscription_start_date,
        s.subscription_type,
        s.status
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      JOIN users u ON us.user_id = u.user_id;
    `;
    const { rows } = await db.query(query);
    res.status(200).json(rows.length ? rows : []);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.stack);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
};

module.exports = {
  addSubscription,
  getSubscriptions,
};