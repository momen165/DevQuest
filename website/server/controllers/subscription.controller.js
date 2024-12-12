const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');


const addSubscription = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;
  const actualPriceId = process.env[`STRIPE_${priceId.toUpperCase()}_PRICE_ID`]; // Get price ID from env

  if (!actualPriceId) {
    return res.status(400).json({error: `Invalid price ID: ${priceId}`});
  }

  try {
    const {rows: userRows} = await db.query('SELECT stripe_customer_id, email FROM users WHERE user_id = $1', [userId]);
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({error: 'User not found.'});
    }

    let stripeCustomerId = user.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      await db.query('UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2', [stripeCustomerId, userId]);
    }

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: actualPriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    const subscriptionId = subscription.id;
    const amountPaid = subscription.latest_invoice.payment_intent?.amount_received / 100 || 0; // Safe access
    const subscriptionType = priceId === 'monthly' ? 'Monthly' : 'Yearly';
    const endDate = priceId === 'monthly' ? '1 month' : '1 year';

    const {rows: subscriptionRows} = await db.query(
        `INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type,
                                   amount_paid, status)
         VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '${endDate}', $2, $3, 'Completed')
         RETURNING subscription_id`,
        [subscriptionId, subscriptionType, amountPaid]
    );

    await db.query('INSERT INTO user_subscription (user_id, subscription_id) VALUES ($1, $2)', [userId, subscriptionRows[0].subscription_id]);

    res.status(201).json({subscription_id: subscriptionRows[0].subscription_id});
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription.' });
  }
};


const handleStripeWebhook = async (req, res) => {
  console.log('Webhook received'); // Initial logging statement

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription;

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const amountPaid = subscription.latest_invoice?.payment_intent?.amount_received / 100 || 0; // Safe access
      const priceId = subscription.items.data[0].price.id;
      const subscriptionType = process.env.STRIPE_MONTHLY_PRICE_ID === priceId ? 'Monthly' : 'Yearly';
      const endDate = subscriptionType === 'Monthly' ? '1 month' : '1 year';

      console.log('Inserting into subscription table:', subscriptionId, subscriptionType, amountPaid, endDate);

      const {rows: subscriptionRows} = await db.query(
          `INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type,
                                     amount_paid, status)
           VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '${endDate}', $2, $3, 'Completed')
           RETURNING subscription_id`,
          [subscriptionId, subscriptionType, amountPaid]
      );

      console.log('Inserting into user_subscription table:', userId, subscriptionRows[0].subscription_id);

      await db.query('INSERT INTO user_subscription (user_id, subscription_id) VALUES ($1, $2)', [userId, subscriptionRows[0].subscription_id]);

    } catch (error) {
      console.error('Webhook subscription creation error:', error);
    }
  }

  res.json({ received: true });
};

const getSubscriptions = async (req, res) => {
  if (!req.user.admin) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const {rows} = await db.query(`
      SELECT s.subscription_id,
             u.name AS student_name,
             s.amount_paid,
             s.subscription_start_date,
             s.subscription_type,
             s.status
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      JOIN users u ON us.user_id = u.user_id`);

    res.status(200).json(rows); // No need for conditional check if rows is empty
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
};

const cancelSubscription = async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    await stripe.subscriptions.del(subscriptionId); // No need to store the deleted subscription
    res.status(204).send(); // 204 No Content is more appropriate after successful deletion
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

const updateSubscription = async (req, res) => {
  const { subscriptionId, newPriceId } = req.body;
  const actualNewPriceId = process.env[`STRIPE_${newPriceId.toUpperCase()}_PRICE_ID`]; // Get price ID from env
  if (!actualNewPriceId) {
    return res.status(400).json({error: `Invalid new price ID: ${newPriceId}`});
  }
  try {
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscriptionId, // This is the subscription item ID, not the subscription ID
        price: actualNewPriceId,
      }],
    });
    res.status(200).json(updatedSubscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription.' });
  }
};


// File: `website/server/controllers/checkout.controller.js`
const getCheckoutSession = async (req, res) => {
  const sessionId = req.params.sessionId;

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({success: true, session});
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    res.status(404).json({success: false, message: 'Session not found'});
  }
};




module.exports = {
  getCheckoutSession,
  addSubscription,
  getSubscriptions,
  cancelSubscription,
  updateSubscription,
  handleStripeWebhook,
};