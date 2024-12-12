const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
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

exports.handleWebhook = async (req, res) => {
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
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const amountPaid = subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType = subscription.items.data[0].price.id === 'price_1QV9vuHxgK7P1VPXGB14mjGT' ? 'Monthly' : 'Yearly';

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
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  }

  res.json({ received: true });
};

exports.cancelSubscription = async (req, res) => {
  const { subscriptionId } = req.body;

  try {
    const deletedSubscription = await stripe.subscriptions.del(subscriptionId);
    res.status(200).json(deletedSubscription);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription.' });
  }
};

exports.updatePaymentMethod = async (req, res) => {
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
