const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const prisma = require("../config/prisma");
const { invalidateUserCache } = require("../utils/cache.utils");

/**
 * Maps Stripe subscription status to boolean database status
 */
const mapStripeStatusToBoolean = (stripeStatus) => {
  return stripeStatus === "active" || stripeStatus === "trialing";
};

const toInt = (value) => Number.parseInt(value, 10);

const resolvePlanType = (priceId) =>
  priceId === process.env.STRIPE_MONTHLY_PRICE_ID ? "Monthly" : "Yearly";

const persistSubscriptionFromStripe = async ({
  userId,
  userEmail,
  stripeCustomerId,
  stripeSubscription,
}) => {
  const subscriptionId = stripeSubscription.id;
  const startDate = new Date(stripeSubscription.current_period_start * 1000);
  const endDate = new Date(stripeSubscription.current_period_end * 1000);
  const amountPaid =
    (stripeSubscription.latest_invoice?.payment_intent?.amount_received ||
      stripeSubscription.items.data[0]?.price?.unit_amount ||
      0) / 100;
  const paymentId = stripeSubscription.latest_invoice?.payment_intent?.id || null;
  const subscriptionType = resolvePlanType(stripeSubscription.items.data[0].price.id);
  const dbStatus = mapStripeStatusToBoolean(stripeSubscription.status);

  const existing = await prisma.subscription.findFirst({
    where: { stripe_subscription_id: subscriptionId },
    select: { subscription_id: true },
  });

  let dbSubscription;

  if (existing) {
    dbSubscription = await prisma.subscription.update({
      where: { subscription_id: existing.subscription_id },
      data: {
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        subscription_type: subscriptionType,
        amount_paid: amountPaid,
        status: dbStatus,
        user_email: userEmail,
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_payment_id: paymentId,
        stripe_customer_id: stripeCustomerId || null,
      },
    });
  } else {
    dbSubscription = await prisma.subscription.create({
      data: {
        subscription_start_date: startDate,
        subscription_end_date: endDate,
        subscription_type: subscriptionType,
        amount_paid: amountPaid,
        status: dbStatus,
        user_email: userEmail,
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_payment_id: paymentId,
        stripe_customer_id: stripeCustomerId || null,
      },
    });
  }

  await prisma.user_subscription.upsert({
    where: {
      user_id_subscription_id: {
        user_id: userId,
        subscription_id: dbSubscription.subscription_id,
      },
    },
    create: {
      user_id: userId,
      subscription_id: dbSubscription.subscription_id,
    },
    update: {},
  });
  invalidateUserCache(userId);

  return dbSubscription;
};

const createCheckoutSession = async (req, res) => {
  const { priceId } = req.body;
  const userId = req.user.userId;

  try {
    // Validate priceId
    let actualPriceId;
    let planType;
    if (priceId === "monthly") {
      actualPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
      planType = "Monthly";
    } else if (priceId === "yearly") {
      actualPriceId = process.env.STRIPE_YEARLY_PRICE_ID;
      planType = "Yearly";
    } else {
      return res
        .status(400)
        .json({ error: "Invalid plan type. Use 'monthly' or 'yearly'." });
    }

    if (!actualPriceId) {
      console.error(`Missing environment variable for ${planType} price ID`);
      return res.status(500).json({ error: "Pricing configuration error." });
    }

    const activeSub = await prisma.subscription.findFirst({
      where: {
        status: true,
        subscription_end_date: { gt: new Date() },
        user_subscription: {
          some: { user_id: Number(userId) },
        },
      },
      select: { subscription_id: true },
    });

    if (activeSub) {
      return res.status(400).json({
        error: "You already have an active subscription.",
      });
    }

    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { email: true, stripe_customer_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    let stripeCustomerId = user.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      await prisma.users.update({
        where: { user_id: Number(userId) },
        data: { stripe_customer_id: stripeCustomerId },
      });
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
        planType,
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
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("Webhook event received:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = toInt(session.client_reference_id || session.metadata?.userId);
      const stripeSubscriptionId = session.subscription;
      const stripeCustomerId = session.customer;

      if (!userId || !stripeSubscriptionId) {
        return res.status(400).json({ error: "Missing user or subscription reference." });
      }

      const user = await prisma.users.findUnique({
        where: { user_id: userId },
        select: { email: true, stripe_customer_id: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      if (!user.stripe_customer_id && stripeCustomerId) {
        await prisma.users.update({
          where: { user_id: userId },
          data: { stripe_customer_id: stripeCustomerId },
        });
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
        {
          expand: ["latest_invoice.payment_intent"],
        }
      );

      await persistSubscriptionFromStripe({
        userId,
        userEmail: user.email,
        stripeCustomerId,
        stripeSubscription,
      });
    } else if (event.type === "customer.subscription.updated") {
      const stripeSubscription = event.data.object;
      const stripeSubscriptionId = stripeSubscription.id;
      const stripeCustomerId = stripeSubscription.customer;

      const existing = await prisma.subscription.findFirst({
        where: { stripe_subscription_id: stripeSubscriptionId },
        select: { user_id: true, user_email: true },
      });

      let userId = existing?.user_id || null;
      let userEmail = existing?.user_email || null;

      if (!userId && stripeCustomerId) {
        const user = await prisma.users.findFirst({
          where: { stripe_customer_id: stripeCustomerId },
          select: { user_id: true, email: true },
        });
        userId = user?.user_id || null;
        userEmail = user?.email || null;
      }

      if (userId && userEmail) {
        const fullSubscription = await stripe.subscriptions.retrieve(
          stripeSubscriptionId,
          { expand: ["latest_invoice.payment_intent"] }
        );

        await persistSubscriptionFromStripe({
          userId,
          userEmail,
          stripeCustomerId,
          stripeSubscription: fullSubscription,
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const stripeSubscription = event.data.object;
      const stripeSubscriptionId = stripeSubscription.id;
      const affectedUsers = await prisma.subscription.findMany({
        where: { stripe_subscription_id: stripeSubscriptionId },
        select: { user_id: true },
      });

      await prisma.subscription.updateMany({
        where: { stripe_subscription_id: stripeSubscriptionId },
        data: { status: false },
      });

      for (const row of affectedUsers) {
        if (row.user_id) {
          invalidateUserCache(row.user_id);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Failed to process webhook." });
  }
};

const createPortalSession = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.users.findUnique({
      where: { user_id: Number(userId) },
      select: { stripe_customer_id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    let stripeCustomerId = user.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: userId.toString() },
      });
      stripeCustomerId = customer.id;

      await prisma.users.update({
        where: { user_id: Number(userId) },
        data: { stripe_customer_id: stripeCustomerId },
      });
    }

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
    const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
    const yearlyPriceId = process.env.STRIPE_YEARLY_PRICE_ID;

    if (!monthlyPriceId || !yearlyPriceId) {
      return res.status(500).json({
        error: "Pricing configuration is incomplete",
      });
    }

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
