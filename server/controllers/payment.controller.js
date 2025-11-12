const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const db = require("../config/database"); // Adjust path to your DB connection

const createCheckoutSession = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
    // Validate priceId - only accept canonical plan keys
    let actualPriceId;
    let planType;
    if (priceId === "monthly") {
      actualPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
      planType = "Monthly";
    } else if (priceId === "yearly") {
      actualPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
      planType = "Yearly";
    } else {
      return res.status(400).json({ error: "Invalid plan type. Use 'monthly' or 'yearly'." });
    }

    if (!actualPriceId) {
      console.error(`Missing environment variable for ${planType} price ID`);
      return res.status(500).json({ error: "Pricing configuration error." });
    }

    // Check for active subscription first (check for 'active' and 'trialing' statuses)
    const activeSubQuery = `
      SELECT s.*
      FROM subscription s
      JOIN user_subscription us ON s.subscription_id = us.subscription_id
      WHERE us.user_id = $1
      AND s.status IN ('active', 'trialing')
      AND s.subscription_end_date > CURRENT_DATE;
    `;
    const { rows } = await db.query(activeSubQuery, [userId]);

    if (rows.length > 0) {
      return res.status(400).json({
        error: "You already have an active subscription.",
      });
    }

    // Fetch or create Stripe customer
    const userQuery = "SELECT email, stripe_customer_id FROM users WHERE user_id = $1";
    const { rows: userRows } = await db.query(userQuery, [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const userEmail = userRows[0].email;
    let stripeCustomerId = userRows[0].stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      // Persist customer ID
      const updateUserQuery = "UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2";
      await db.query(updateUserQuery, [stripeCustomerId, userId]);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: actualPriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        planType: planType,
      },
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Stripe checkout session creation error:", error);
    res.status(500).json({ error: "Failed to create checkout session." });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log("Webhook event received:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle initial subscription creation
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("Checkout session completed:", session);

    const userId = session.client_reference_id;
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    if (!subscriptionId) {
      console.error("Subscription ID is null:", { session });
      return res.status(400).json({ error: "Subscription ID is null." });
    }

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      // Check for existing subscription (idempotency)
      const existingSubQuery = "SELECT subscription_id FROM subscription WHERE stripe_subscription_id = $1";
      const { rows: existingRows } = await client.query(existingSubQuery, [subscriptionId]);
      
      if (existingRows.length > 0) {
        console.log("Subscription already exists (idempotent webhook):", subscriptionId);
        await client.query("COMMIT");
        return res.json({ received: true, message: "Subscription already processed" });
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["latest_invoice.payment_intent"],
      });

      const amountPaid =
        subscription.latest_invoice.payment_intent.amount_received / 100;
      const subscriptionType =
        subscription.items.data[0].price.id ===
        process.env.STRIPE_MONTHLY_PRICE_ID
          ? "Monthly"
          : "Yearly";
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const paymentId = subscription.latest_invoice.payment_intent.id;
      const stripeStatus = subscription.status;

      const userQuery = "SELECT email, stripe_customer_id FROM users WHERE user_id = $1";
      const { rows: userRows } = await client.query(userQuery, [userId]);
      if (userRows.length === 0) {
        await client.query("ROLLBACK");
        console.error("User not found:", { userId });
        return res.status(404).json({ error: "User not found." });
      }
      const userEmail = userRows[0].email;
      
      // Update user's stripe_customer_id if not set
      if (!userRows[0].stripe_customer_id && customerId) {
        const updateUserQuery = "UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2";
        await client.query(updateUserQuery, [customerId, userId]);
      }

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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING subscription_id;
      `;

      const { rows: subscriptionRows } = await client.query(
        subscriptionQuery,
        [
          subscriptionId,
          startDate,
          endDate,
          subscriptionType,
          amountPaid,
          stripeStatus, // Use actual Stripe status (active, trialing, etc.)
          userEmail,
          userId,
          subscriptionId,
          paymentId,
          customerId,
        ],
      );

      const dbSubscriptionId = subscriptionRows[0].subscription_id;

      const userSubscriptionQuery = `
        INSERT INTO user_subscription (user_id, subscription_id)
        VALUES ($1, $2);
      `;
      await client.query(userSubscriptionQuery, [userId, dbSubscriptionId]);

      await client.query("COMMIT");
      console.log("Subscription created successfully:", {
        userId,
        subscriptionId: dbSubscriptionId,
        customerId,
        userEmail,
        status: stripeStatus,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error creating subscription:", error);
      return res.status(500).json({ error: "Failed to create subscription" });
    } finally {
      client.release();
    }
  }
  // Handle subscription updates
  else if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    console.log("Subscription updated event:", subscription);

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);
      const amountPaid = subscription.items.data[0].price.unit_amount / 100;
      const subscriptionId = subscription.id;
      const subscriptionType =
        subscription.items.data[0].price.id ===
        process.env.STRIPE_MONTHLY_PRICE_ID
          ? "Monthly"
          : "Yearly";

      // Map Stripe statuses to our status values
      const stripeStatus = subscription.status;
      let dbStatus;
      switch (stripeStatus) {
        case "active":
        case "trialing":
          dbStatus = stripeStatus;
          break;
        case "past_due":
        case "unpaid":
          dbStatus = "past_due";
          break;
        case "canceled":
        case "incomplete":
        case "incomplete_expired":
          dbStatus = "cancelled";
          break;
        default:
          dbStatus = "inactive";
      }

      console.log("Update values:", {
        startDate,
        endDate,
        amountPaid,
        subscriptionId,
        subscriptionType,
        stripeStatus,
        dbStatus,
      });

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

      const { rows } = await client.query(updateQuery, [
        startDate,
        endDate,
        amountPaid,
        subscriptionType,
        dbStatus,
        subscriptionId,
      ]);

      console.log("Update query result:", rows);

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        console.error("No subscription found with ID:", subscriptionId);
        return res.status(404).json({ error: "No subscription found to update" });
      }

      await client.query("COMMIT");
      console.log("Subscription updated successfully:", {
        subscriptionId,
        newEndDate: endDate,
        status: dbStatus,
        updatedSubscription: rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error processing subscription update:", error);
      return res.status(500).json({ error: "Failed to process subscription update" });
    } finally {
      client.release();
    }
  }
  // Handle subscription cancellations
  else if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;

    const client = await db.connect();
    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE subscription 
        SET status = 'cancelled',
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = $1
        RETURNING *;
      `;

      const { rows } = await client.query(updateQuery, [subscriptionId]);

      if (rows.length === 0) {
        await client.query("ROLLBACK");
        console.error("No subscription found to cancel:", subscriptionId);
        return res.status(404).json({ error: "No subscription found to cancel" });
      }

      await client.query("COMMIT");
      console.log("Subscription cancelled successfully:", subscriptionId);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error cancelling subscription:", error);
      return res.status(500).json({ error: "Failed to cancel subscription" });
    } finally {
      client.release();
    }
  }

  // Return success response
  res.json({ received: true });
};

const createPortalSession = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get the customer ID from the users table (more reliable than subscription table)
    const userQuery = `
      SELECT stripe_customer_id, email
      FROM users
      WHERE user_id = $1;
    `;

    const { rows } = await db.query(userQuery, [userId]);

    if (!rows.length) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    let stripeCustomerId = rows[0].stripe_customer_id;

    // If no customer ID exists, create one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: rows[0].email,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      // Update the user record
      const updateQuery = "UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2";
      await db.query(updateQuery, [stripeCustomerId, userId]);
    }

    // Create a billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({
      error: "Failed to create portal session",
    });
  }
};

const getPricingPlans = async (req, res) => {
  try {
    // Fetch price details from Stripe to ensure accuracy
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      return res.status(500).json({
        error: "Pricing configuration is incomplete",
      });
    }

    // Fetch prices from Stripe
    const [monthlyPrice, yearlyPrice] = await Promise.all([
      stripe.prices.retrieve(monthlyPriceId),
      stripe.prices.retrieve(yearlyPriceId),
    ]);

    const plans = {
      monthly: {
        id: "monthly",
        name: "Monthly Plan",
        priceId: monthlyPriceId,
        amount: monthlyPrice.unit_amount / 100,
        currency: monthlyPrice.currency,
        interval: "month",
      },
      yearly: {
        id: "yearly",
        name: "Yearly Plan",
        priceId: yearlyPriceId,
        amount: yearlyPrice.unit_amount / 100,
        currency: yearlyPrice.currency,
        interval: "year",
      },
    };

    res.json(plans);
  } catch (error) {
    console.error("Error fetching pricing plans:", error);
    res.status(500).json({
      error: "Failed to fetch pricing plans",
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  createPortalSession,
  getPricingPlans,
};
