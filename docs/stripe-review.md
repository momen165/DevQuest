# Stripe Integration Review

_Date: 2025-10-04_

## Scope

- Backend payment flow (`server/controllers/payment.controller.js`, `server/routes/payment.routes.js`, webhook registration in `server/server.js`).
- Subscription management logic (`server/controllers/subscription.controller.js`, `server/routes/subscription.routes.js`).
- Frontend checkout and billing UI (`client/src/pages/user/PricingPage.jsx`, `client/src/pages/user/Billing.jsx`, `client/src/pages/user/PaymentSuccessPage.jsx`).
- Supporting auth, middleware, and environment configuration relevant to Stripe requests.

## Strengths

- Webhook endpoint is mounted with `express.raw()` before JSON parsing, enabling Stripe signature verification.
- Checkout and billing flows rely on Stripe-hosted experiences (`redirectToCheckout`, Billing Portal), limiting PCI exposure.
- Backend persists detailed subscription metadata (Stripe IDs, dates, amounts) with guarded transactions to keep relational data consistent.
- Helmet CSP allows `https://js.stripe.com` while tightening other origins.

## Issues & Risks

1. **Unvalidated `priceId` inputs**
   - `createCheckoutSession` trusts the client-supplied `priceId`, letting attackers substitute arbitrary Stripe prices or products.

2. **Missing customer linkage**
   - Checkout sessions omit the `customer`/`customer_email` field, so Stripe auto-creates detached customers; Billing Portal relies on a stored `stripe_customer_id`, leading to mismatches and failed portal sessions.

3. **Status inconsistency**
   - Active-subscription queries look for `status = 'Completed'`, yet webhooks insert `'active'`. Users who already paid can be prompted to repurchase.

4. **Webhook idempotency gaps**
   - `checkout.session.completed` inserts rows without checking for existing `stripe_subscription_id`. Stripe retries will duplicate records; DB failures still return 200, preventing automatic retries.

5. **Limited subscription status handling**
   - `customer.subscription.updated` collapses all non-`active` states to `'inactive'`, ignoring `trialing`, `past_due`, or `unpaid`, which can incorrectly revoke access.

6. **Portal session dependency**
   - `createPortalSession` requires `stripe_customer_id` on the latest subscription row; missing values or cancellations cause 404 errors.

7. **Exposed checkout session endpoint**
   - `/api/checkout-session/:sessionId` is unauthenticated and returns the full session object. An attacker could brute-force IDs for metadata leakage.

8. **Environment variable drift**
   - Backend success/cancel URLs use `CLIENT_URL`, while CORS configuration references `FRONTEND_URL`. Divergent environments risk mismatched redirects.

9. **Frontend price configuration**
   - `PricingPage.jsx` hard-codes two Stripe price IDs and displays the amounts separately. Changing prices or environments requires code edits.

10. **Legacy code path risks**
    - `addSubscription` in `subscription.controller.js` references columns not present in the insert statement; wiring this path would fail at runtime.

## Recommendations

1. Accept only canonical plan keys server-side (`monthly`/`yearly`) and map them to env-configured price IDs; reject unknown values.
2. Ensure Stripe customers exist prior to checkout (`customer: stripeCustomerId` or `customer_email`) and persist the resulting ID if newly created.
3. Harmonize subscription status vocabulary and update active-check queries to treat `active`, `trialing`, and other valid states appropriately.
4. Guard webhook inserts with uniqueness checks (`SELECT` or `ON CONFLICT`) and return non-2xx responses when persistence fails so Stripe retries.
5. Expand `customer.subscription.updated` handling to map Stripe statuses explicitly and drive corresponding entitlements.
6. Cache or derive `stripe_customer_id` independently of subscription rows so Billing Portal works post-cancellation and on first-time subscriptions.
7. Protect `/checkout-session/:sessionId` with auth and/or return a minimal confirmation payload instead of the full Stripe session object.
8. Consolidate environment variable names for frontend URLs across CORS, success/cancel redirects, and documentation.
9. Move plan catalog (name, price, Stripe ID) to configuration fetched from the backend or environment so the UI stays in sync across deployments.
10. Prune or fix unused subscription-controller paths like `addSubscription` to prevent future bugs.

## Suggested Next Steps

- Prioritize server-side validation and webhook idempotency to stop duplicate or tampered purchases.
- Align customer creation and status semantics, then verify Billing Portal and active-subscription checks with real Stripe data.
- Address UI configuration and environment consistency to simplify future deployments.

_No production code was modified during this review._
