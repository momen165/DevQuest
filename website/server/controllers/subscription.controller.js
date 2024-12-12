const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database'); // Adjust path to your DB connection

// Add a subscription
const addSubscription = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
    // Fetch the Stripe customer ID from the database
    const userQuery = 'SELECT stripe_customer_id, email FROM users WHERE user_id = $1';
    const { rows: userRows } = await db.query(userQuery, [userId]);
    let stripeCustomerId = userRows[0].stripe_customer_id;
    const userEmail = userRows[0].email;

    // Create a Stripe customer if it doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      // Update the user record with the new Stripe customer ID
      const updateUserQuery = 'UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2';
      await db.query(updateUserQuery, [stripeCustomerId, userId]);
    }

    // Use actual price IDs from your Stripe account
    const actualPriceId = priceId === 'monthly' ? 'price_1QV9vuHxgK7P1VPXGB14mjGT' : 'price_1QVBWXHxgK7P1VPX5pSXWJbG';

    // Create a subscription in Stripe
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: actualPriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    const subscriptionId = subscription.id;
    const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
    const subscriptionType = priceId === 'monthly' ? 'Monthly' : 'Yearly';

    const subscriptionQuery = `
      INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type, amount_paid, status)
      VALUES (
        $1,
        CURRENT_DATE,
        CASE 
          WHEN $2 = 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
          WHEN $2 = 'Yearly' THEN CURRENT_DATE + INTERVAL '1 year'
        END,
        $2,
        $3,
        'Completed'
      )
      RETURNING subscription_id;
    `;
    const { rows: subscriptionRows } = await db.query(subscriptionQuery, [subscriptionId, subscriptionType, amountPaid]);
    const dbSubscriptionId = subscriptionRows[0].subscription_id;

    const userSubscriptionQuery = `
      INSERT INTO user_subscription (user_id, subscription_id)
      VALUES ($1, $2);
    `;
    await db.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

    console.log('Subscription created successfully:', { userId, dbSubscriptionId });

    res.status(201).json({ subscription_id: dbSubscriptionId });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
};

// Handle Stripe webhook events
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription;

    try {
      // Retrieve the subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType = subscription.items.data[0].price.id === 'price_1QV9vuHxgK7P1VPXGB14mjGT' ? 'Monthly' : 'Yearly';

      console.log('Subscription details:', {
        subscriptionId,
        amountPaid,
        subscriptionType,
        userId,
      });

      const subscriptionQuery = `
        INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type, amount_paid, status)
        VALUES (
          $1,
          CURRENT_DATE,
          CASE 
            WHEN $2 = 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
            WHEN $2 = 'Yearly' THEN CURRENT_DATE + INTERVAL '1 year'
          END,
          $2,
          $3,
          'Completed'
        )
        RETURNING subscription_id;
      `;
      const { rows: subscriptionRows } = await db.query(subscriptionQuery, [subscriptionId, subscriptionType, amountPaid]);
      const dbSubscriptionId = subscriptionRows[0].subscription_id;

      console.log('Subscription inserted into database:', dbSubscriptionId);

      const userSubscriptionQuery = `
        INSERT INTO user_subscription (user_id, subscription_id)
        VALUES ($1, $2);
      `;
      await db.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

      console.log('User subscription inserted into database:', { userId, dbSubscriptionId });
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  }

  res.json({ received: true });
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
    console.log('Fetched subscriptions:', rows);
    res.status(200).json(rows.length ? rows : []);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.stack);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
};

// Cancel a subscription
const cancelSubscription = async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
    console.log('Subscription cancelled successfully:', deletedSubscription);
    res.status(200).json(deletedSubscription);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

// Update a subscription
const updateSubscription = async (req, res) => {
  const { subscriptionId, newPriceId } = req.body;

  try {
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscriptionId, // Subscription item ID
        price: newPriceId,   // New price ID (new plan)
      }],
    });
    console.log('Subscription updated successfully:', updatedSubscription);
    res.status(200).json(updatedSubscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
};

module.exports = {
  addSubscription,
  getSubscriptions,
  cancelSubscription,
  updateSubscription,
  handleStripeWebhook,
};