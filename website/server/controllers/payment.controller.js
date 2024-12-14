const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database'); // Adjust path to your DB connection

const createCheckoutSession = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
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
      client_reference_id: userId, // Include the user ID in the metadata
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
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice.payment_intent'],
      });
      const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType = subscription.items.data[0].price.id === process.env.STRIPE_MONTHLY_PRICE_ID ? 'Monthly' : 'Yearly';
      const startDate = new Date(subscription.current_period_start * 1000); // Convert timestamp
      const endDate = new Date(subscription.current_period_end * 1000); // Convert timestamp

      // Log subscription details
      console.log('Subscription details:', {
        subscriptionId,
        amountPaid,
        subscriptionType,
        startDate,
        endDate,
      });

      // Fetch the user's email from the database
      const userQuery = 'SELECT email FROM users WHERE user_id = $1';
      const { rows: userRows } = await db.query(userQuery, [userId]);
      if (userRows.length === 0) {
        console.error('User not found:', { userId });
        return res.status(404).json({ error: 'User not found.' });
      }
      const userEmail = userRows[0].email;

      // Log user details
      console.log('User details:', {
        userId,
        userEmail,
      });

      const client = await db.connect();
      try {
        await client.query('BEGIN');

        // Insert into subscription table
        const subscriptionQuery = `
          INSERT INTO subscription (subscription_id, subscription_start_date, subscription_end_date, subscription_type, amount_paid, status, user_id, user_email)
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'Completed',
            $6,
            $7
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
  }

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

module.exports = {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  updatePaymentMethod,
};
