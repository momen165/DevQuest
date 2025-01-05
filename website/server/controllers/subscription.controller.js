const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database'); 
const NodeCache = require('node-cache');

// Initialize cache with 5 minutes TTL
const subscriptionCache = new NodeCache({
  stdTTL: 300, // 5 minutes in seconds
  checkperiod: 320
});

// Add a subscription
const addSubscription = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
    // Fetch the Stripe customer ID from the database
    const userQuery = 'SELECT stripe_customer_id, email FROM users WHERE user_id = $1';
    const { rows: userRows } = await db.query(userQuery, [userId]);
    if (userRows.length === 0) {
      console.error('User not found:', { userId });
      return res.status(404).json({ error: 'User not found.' });
    }
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

    // Validate priceId and map to actual price IDs
    let actualPriceId;
    if (priceId === 'monthly') {
      actualPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    } else if (priceId === 'yearly') {
      actualPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
    } else {
      return res.status(400).json({ error: 'Invalid priceId.' });
    }

    // Create a subscription in Stripe
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: actualPriceId }],
      expand: ['latest_invoice.payment_intent'],
    });

    const subscriptionId = subscription.id;
    const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
    const subscriptionType = priceId === 'monthly' ? 'Monthly' : 'Yearly';

    // Log subscription details
    ;

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const subscriptionQuery = `
        INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type,
        amount_paid, status)
        VALUES (
          $1,
          CURRENT_DATE,
          CASE 
            WHEN $2 = 'Monthly' THEN CURRENT_DATE + INTERVAL '1 month'
            WHEN $2 = 'Yearly' THEN CURRENT_DATE + INTERVAL '1 year'
          END,
          $2,
          $3,
          'Completed',
          $4,
          $5
        )
        RETURNING subscription_id;
      `;
      const { rows: subscriptionRows } = await client.query(subscriptionQuery, [subscriptionId, subscriptionType, amountPaid, userId, userEmail]);
      const dbSubscriptionId = subscriptionRows[0].subscription_id;

      // Log subscription insertion
      console.log('Subscription inserted into database:', dbSubscriptionId);

      const userSubscriptionQuery = `
        INSERT INTO user_subscription (user_id, subscription_id)
        VALUES ($1, $2);
      `;
      await client.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

      await client.query('COMMIT');
      console.log('Subscription created successfully:', { userId, dbSubscriptionId });
      res.status(201).json({ subscription_id: dbSubscriptionId });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription.' });
    } finally {
      client.release();
    }
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
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received event: ${event.type}`);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const subscriptionId = session.subscription;

    try {
      // Retrieve the subscription details directly from Stripe
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType = subscription.items.data[0].price.id === process.env.STRIPE_MONTHLY_PRICE_ID ? 'Monthly' : 'Yearly';
      const startDate = new Date(subscription.current_period_start * 1000); // Convert timestamp
      const endDate = new Date(subscription.current_period_end * 1000); // Convert timestamp

      // Log subscription details
      ;

      // Fetch the user's email from the database
      const userQuery = 'SELECT email FROM users WHERE user_id = $1';
      const { rows: userRows } = await db.query(userQuery, [userId]);
      if (userRows.length === 0) {
        console.error('User not found:', { userId });
        return res.status(404).json({ error: 'User not found.' });
      }
      const userEmail = userRows[0].email;

      // Log user details
      ;

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        // Insert into subscription table
        const subscriptionQuery = `
          INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type,
                                    amount_paid, status)
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'Completed'
          )
          RETURNING subscription_id;
        `;
        const { rows: subscriptionRows } = await client.query(subscriptionQuery, [
          subscriptionId,
          startDate,
          endDate,
          subscriptionType,
          amountPaid,
          userId,
          userEmail,
        ]);
        const dbSubscriptionId = subscriptionRows[0].subscription_id;

        // Log subscription insertion
        console.log('Subscription inserted into database:', dbSubscriptionId);

        // Insert into user_subscription table
        const userSubscriptionQuery = `
          INSERT INTO user_subscription (user_id, subscription_id)
          VALUES ($1, $2);
        `;
        await client.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

        await client.query('COMMIT');
        console.log('User subscription inserted into database:', { userId, dbSubscriptionId });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating subscription:', error);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  } else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const amountPaid = invoice.amount_paid / 100;

    console.log('Invoice payment succeeded:', {
      subscriptionId,
      amountPaid,
    });

    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');
        const updateSubscriptionQuery = `
          UPDATE subscription
          SET amount_paid = $1, status = 'Completed'
          WHERE subscription_id = $2;
        `;
        await client.query(updateSubscriptionQuery, [amountPaid, subscriptionId]);

        await client.query('COMMIT');
        console.log('Subscription updated successfully:', { subscriptionId, amountPaid });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating subscription:', error);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
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
      SELECT s.subscription_id,
             u.name AS student_name,
             s.amount_paid,
             s.subscription_start_date,
             s.subscription_type,
             s.status
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      JOIN users u ON us.user_id = u.user_id;
    `;
    const {rows} = await db.query(query);
    
    res.status(200).json(rows.length ? rows : []);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.stack);
    res.status(500).json({ error: 'Failed to fetch subscriptions.' });
  }
};

// List subscriptions
const listSubscriptions = async (req, res) => {
  const { customerId, status, limit } = req.query;

  try {
    let query = `
      SELECT subscription_id,
             subscription_type,
             subscription_start_date,
             subscription_end_date,
             amount_paid,
             status,
             stripe_payment_id,
             renewal_date,
             stripe_subscription_id,
             user_id,
             user_email
      FROM public.subscription
    `;

    const queryParams = [];
    if (customerId) {
      query += ' WHERE user_id = $1';
      queryParams.push(customerId);
    }

    if (status) {
      query += queryParams.length ? ' AND status = $2' : ' WHERE status = $1';
      queryParams.push(status);
    }

    if (limit) {
      query += ' LIMIT $' + (queryParams.length + 1);
      queryParams.push(parseInt(limit));
    }

    const {rows} = await db.query(query, queryParams);
    res.status(200).json(rows.length ? rows : []);
  } catch (error) {
    console.error('Error listing subscriptions:', error);
    res.status(500).json({ error: 'Failed to list subscriptions.' });
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
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItemId = subscription.items.data[0].id;

    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscriptionItemId, // Subscription item ID
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

// Retrieve a subscription
const retrieveSubscription = async (req, res) => {
  const { id } = req.params;

  try {
    const subscription = await stripe.subscriptions.retrieve(id);
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription.' });
  }
};

// Retrieve a subscription directly from Stripe
const retrieveSubscriptionFromStripe = async (req, res) => {
  const { subscriptionId } = req.params;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    res.status(200).json(subscription);
  } catch (error) {
    console.error('Error retrieving subscription from Stripe:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription from Stripe.' });
  }
};

// website/server/controllers/subscription.controller.js
const checkActiveSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Check cache first
    const cacheKey = `subscription_${userId}`;
    const cachedData = subscriptionCache.get(cacheKey);
    
    if (cachedData) {
      console.log('\x1b[32m%s\x1b[0m', `🎯 Cache HIT for subscription check - User ID: ${userId}`);
      return res.json(cachedData);
    }
    
    const query = `
      SELECT s.*
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      WHERE us.user_id = $1 
      AND s.status = 'active'
      AND s.subscription_end_date > CURRENT_TIMESTAMP
      ORDER BY s.subscription_start_date DESC
      LIMIT 1;
    `;

    const { rows } = await db.query(query, [userId]);

    const response = {
      hasActiveSubscription: rows.length > 0,
      subscription: rows.length > 0 ? {
        subscription_type: rows[0].subscription_type,
        status: rows[0].status,
        subscription_end_date: rows[0].subscription_end_date,
        amount_paid: rows[0].amount_paid
      } : null
    };

    // Store in cache
    subscriptionCache.set(cacheKey, response);
    console.log('\x1b[33m%s\x1b[0m', `💾 Cache MISS - Storing subscription data for User ID: ${userId}`);
    
    res.json(response);
  } catch (error) {
    console.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
};

const checkSubscriptionStatusFromDb = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get subscription status and completed lessons in a single query
    const query = `
      WITH completed_lessons AS (
        SELECT COUNT(*) as lesson_count
        FROM lesson_progress
        WHERE user_id = $1 AND completed = true
      ),
      subscription_status AS (
        SELECT s.*
        FROM subscription s
        JOIN user_subscription us ON s.subscription_id = us.subscription_id
        WHERE us.user_id = $1 
        AND s.status = 'active'
        AND s.subscription_end_date > CURRENT_TIMESTAMP
        ORDER BY s.subscription_start_date DESC
        LIMIT 1
      )
      SELECT 
        cl.lesson_count,
        s.*
      FROM completed_lessons cl
      CROSS JOIN subscription_status s;
    `;

    const { rows } = await db.query(query, [userId]);
    
    // Format the response
    if (rows.length > 0 && rows[0].subscription_id) {
      res.json({
        hasActiveSubscription: true,
        completedLessons: parseInt(rows[0].lesson_count) || 0,
        subscription: {
          subscription_type: rows[0].subscription_type,
          status: rows[0].status,
          subscription_end_date: rows[0].subscription_end_date,
          amount_paid: rows[0].amount_paid
          
        }
        
      });
     
    } else {
      // User has no active subscription
      res.json({
        hasActiveSubscription: false,
        completedLessons: parseInt(rows[0]?.lesson_count) || 0,
        subscription: null
      });
    }
  } catch (error) {
    console.error('Error checking subscription status from DB:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
 
};

module.exports = {
  addSubscription,
  getSubscriptions,
  cancelSubscription,
  updateSubscription,
  handleStripeWebhook,
  listSubscriptions,
  retrieveSubscription,
  retrieveSubscriptionFromStripe,
  checkActiveSubscription,
  checkSubscriptionStatusFromDb,
};