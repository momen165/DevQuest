const db = require('../config/database');

const subscribe = async (req, res) => {
  const { amount_paid } = req.body;
  const userId = req.user.userId;

  try {
    const subscriptionQuery = `
      INSERT INTO subscription (subscription_start_date, amount_paid, status)
      VALUES (CURRENT_DATE, $1, 'Completed')
      RETURNING subscription_id;
    `;
    const { rows: subscriptionRows } = await db.query(subscriptionQuery, [amount_paid]);

    const subscriptionId = subscriptionRows[0].subscription_id;
    const userSubscriptionQuery = `INSERT INTO user_subscription (user_id, subscription_id) VALUES ($1, $2)`;
    await db.query(userSubscriptionQuery, [userId, subscriptionId]);

    res.status(201).json({ subscription_id: subscriptionId });
  } catch (err) {
    console.error('Error creating subscription:', err);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
};

module.exports = { subscribe };
