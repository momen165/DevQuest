const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database'); // Adjust path to your DB connection

const createCheckoutSession = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
    // Check for active subscription first
    const activeSubQuery = `
      SELECT s.*
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      WHERE us.user_id = $1
      AND s.status = 'Completed'
      AND s.subscription_end_date > CURRENT_DATE;
    `;
    const { rows } = await db.query(activeSubQuery, [userId]);
    
    if (rows.length > 0) {
      return res.status(400).json({ 
        error: 'You already have an active subscription.' 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      client_reference_id: userId,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Webhook event received:', event.type);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle initial subscription creation
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Checkout session completed:', session);

    const userId = session.client_reference_id;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (!subscriptionId) {
      console.error('Subscription ID is null:', {session});
      return res.status(400).json({error: 'Subscription ID is null.'});
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });

      const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType = subscription.items.data[0].price.id === process.env.STRIPE_MONTHLY_PRICE_ID ? 'Monthly' : 'Yearly';
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const paymentId = subscription.latest_invoice.payment_intent.id;

      const userQuery = 'SELECT email FROM users WHERE user_id = $1';
      const { rows: userRows } = await db.query(userQuery, [userId]);
      if (userRows.length === 0) {
        console.error('User not found:', { userId });
        return res.status(404).json({ error: 'User not found.' });
      }
      const userEmail = userRows[0].email;

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const subscriptionQuery = `
          INSERT INTO subscription (
            subscription_id, 
            subscription_start_date, 
            subscription_end_date, 
            subscription_type,
            amount_paid, 
            status, 
            user_email, 
            user_id, 
            stripe_subscription_id, 
            stripe_payment_id,
            stripe_customer_id
          )
          VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10)
          RETURNING subscription_id;
        `;
        
        const { rows: subscriptionRows } = await client.query(subscriptionQuery, [
          subscriptionId,
          startDate,
          endDate,
          subscriptionType,
          amountPaid,
          userEmail,
          userId,
          subscriptionId,
          paymentId,
          customerId
        ]);

        const dbSubscriptionId = subscriptionRows[0].subscription_id;

        const userSubscriptionQuery = `
          INSERT INTO user_subscription (user_id, subscription_id)
          VALUES ($1, $2);
        `;
        await client.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

        await client.query('COMMIT');
        console.log('Subscription created successfully:', {
          userId,
          subscriptionId: dbSubscriptionId,
          customerId,
          userEmail
        });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating subscription:', error);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }
  // Handle subscription updates
  else if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    console.log('Subscription updated event:', subscription);
    
    try {
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const amountPaid = subscription.items.data[0].price.unit_amount / 100;
      const subscriptionId = subscription.id;
      const subscriptionType = subscription.items.data[0].price.id === process.env.STRIPE_MONTHLY_PRICE_ID ? 'Monthly' : 'Yearly';
      
      console.log('Update values:', {
        startDate,
        endDate,
        amountPaid,
        subscriptionId,
        subscriptionType
      });

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const updateQuery = `
          UPDATE subscription 
          SET subscription_start_date = $1,
              subscription_end_date = $2,
              amount_paid = $3,
              subscription_type = $4,
              status = $5,
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = $6
          RETURNING *;
        `;

        const status = subscription.status === 'active' ? 'active' : 'inactive';

        const { rows } = await client.query(updateQuery, [
          startDate,
          endDate,
          amountPaid,
          subscriptionType,
          status,
          subscriptionId
        ]);

        console.log('Update query result:', rows);

        if (rows.length === 0) {
          console.error('No subscription found with ID:', subscriptionId);
          throw new Error('No subscription found to update');
        }

        await client.query('COMMIT');
        console.log('Subscription updated successfully:', {
          subscriptionId,
          newEndDate: endDate,
          updatedSubscription: rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing subscription update:', error);
    }
  }
  // Handle subscription cancellations
  else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    try {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const updateQuery = `
          UPDATE subscription 
          SET status = 'cancelled',
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = $1
          RETURNING *;
        `;

        const { rows } = await client.query(updateQuery, [subscriptionId]);

        if (rows.length === 0) {
          throw new Error('No subscription found to cancel');
        }

        await client.query('COMMIT');
        console.log('Subscription cancelled successfully:', subscriptionId);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error cancelling subscription:', error);
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error processing subscription cancellation:', error);
    }
  }

  // Return success response
  res.json({ received: true });
};




const cancelSubscription = async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
    res.status(200).json(deletedSubscription);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

const updatePaymentMethod = async (req, res) => {
  const { customerId, paymentMethodId } = req.body;

  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    res.status(200).json({ message: 'Payment method updated successfully.' });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({ error: 'Failed to update payment method.' });
  }
};



const createPortalSession = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get the customer ID from the active subscription
    const subscriptionQuery = `
      SELECT s.stripe_customer_id
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      WHERE us.user_id = $1 
      AND s.status = 'active'
      ORDER BY s.subscription_start_date DESC
      LIMIT 1;
    `;

    const { rows } = await db.query(subscriptionQuery, [userId]);

    if (!rows.length || !rows[0].stripe_customer_id) {
      return res.status(404).json({ 
        error: 'No active subscription found for this user' 
      });
    }

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${process.env.CLIENT_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ 
      error: 'Failed to create portal session' 
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  updatePaymentMethod,
  createPortalSession,
};
