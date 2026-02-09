const prisma = require("../config/prisma");
const NodeCache = require("node-cache");
const { toIntId } = require("../utils/authz.utils");

// Initialize cache with 15 minutes TTL and check every 5 minutes
const subscriptionCache = new NodeCache({
  stdTTL: 900,
  checkperiod: 300,
  useClones: false,
  deleteOnExpire: true,
  maxKeys: 5000,
});

const getActiveSubscriptionForUser = async (userId) => {
  return prisma.subscription.findFirst({
    where: {
      status: true,
      subscription_end_date: { gt: new Date() },
      user_subscription: {
        some: { user_id: userId },
      },
    },
    orderBy: {
      subscription_start_date: "desc",
    },
    select: {
      subscription_type: true,
      status: true,
      subscription_end_date: true,
      amount_paid: true,
    },
  });
};

// List subscriptions
const listSubscriptions = async (req, res) => {
  const { customerId, status, limit } = req.query;

  try {
    if (!req.user?.admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const where = {};

    if (customerId !== undefined) {
      const normalizedCustomerId = toIntId(customerId);
      if (normalizedCustomerId === null) {
        return res.status(400).json({ error: "Invalid customerId." });
      }
      where.user_id = normalizedCustomerId;
    }

    if (status !== undefined && status !== null && status !== "") {
      const normalizedStatus = String(status).toLowerCase();
      if (!["true", "false", "1", "0"].includes(normalizedStatus)) {
        return res.status(400).json({
          error: "Invalid status. Expected true/false or 1/0.",
        });
      }
      where.status = normalizedStatus === "true" || normalizedStatus === "1";
    }

    let take;
    if (limit !== undefined && limit !== null && limit !== "") {
      const parsedLimit = toIntId(limit);
      if (parsedLimit === null || parsedLimit <= 0) {
        return res.status(400).json({ error: "Invalid limit value." });
      }
      take = Math.min(parsedLimit, 200);
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      ...(take ? { take } : {}),
      orderBy: { subscription_start_date: "desc" },
      select: {
        subscription_id: true,
        subscription_type: true,
        subscription_start_date: true,
        subscription_end_date: true,
        amount_paid: true,
        status: true,
        stripe_payment_id: true,
        stripe_subscription_id: true,
        user_id: true,
        user_email: true,
      },
    });

    res.status(200).json(subscriptions);
  } catch (error) {
    console.error("Error listing subscriptions:", error);
    res.status(500).json({ error: "Failed to list subscriptions." });
  }
};

// Check active subscription
const checkActiveSubscription = async (req, res) => {
  try {
    const userId = toIntId(req.user?.userId ?? req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const activeSubscription = await getActiveSubscriptionForUser(userId);

    const response = {
      hasActiveSubscription: Boolean(activeSubscription),
      subscription: activeSubscription,
    };

    res.json(response);
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
};

const checkSubscriptionStatusFromDb = async (req, res) => {
  try {
    const userId = toIntId(req.user?.userId ?? req.user?.user_id);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [completedLessons, activeSubscription] = await prisma.$transaction([
      prisma.lesson_progress.count({
        where: {
          user_id: userId,
          completed: true,
        },
      }),
      getActiveSubscriptionForUser(userId),
    ]);

    if (activeSubscription) {
      res.json({
        hasActiveSubscription: true,
        completedLessons,
        subscription: activeSubscription,
      });
    } else {
      res.json({
        hasActiveSubscription: false,
        completedLessons,
        subscription: null,
      });
    }
  } catch (error) {
    console.error("Error checking subscription status from DB:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
};

// Get subscription status for any user (admin only)
const getSubscriptionStatusForUser = async (req, res) => {
  try {
    if (!req.user.admin) {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const userId = toIntId(req.params.userId);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const activeSubscription = await getActiveSubscriptionForUser(userId);

    const response = {
      hasActiveSubscription: Boolean(activeSubscription),
      subscription: activeSubscription,
    };

    res.json(response);
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
};

// Warm up the subscription cache
const warmSubscriptionCache = async (userId) => {
  const normalizedUserId = toIntId(userId);
  if (!normalizedUserId) return;

  const cacheKey = `subscription_${normalizedUserId}`;

  // Skip if already in cache
  if (subscriptionCache.has(cacheKey)) return;

  try {
    const activeSubscription =
      await getActiveSubscriptionForUser(normalizedUserId);

    const response = {
      hasActiveSubscription: Boolean(activeSubscription),
      subscription: activeSubscription,
    };

    subscriptionCache.set(cacheKey, response);
  } catch (error) {
    console.error("Error warming subscription cache:", error);
  }
};

module.exports = {
  checkActiveSubscription,
  checkSubscriptionStatusFromDb,
  listSubscriptions,
  getSubscriptionStatusForUser,
  warmSubscriptionCache,
};
