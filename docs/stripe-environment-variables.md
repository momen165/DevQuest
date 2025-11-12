# Stripe Integration - Environment Variables Guide

## Required Environment Variables

### Backend (.env)

```bash
# === Stripe Configuration ===

# Stripe Secret Key (starts with sk_test_ or sk_live_)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Webhook Secret (starts with whsec_)
# Get this from Stripe Dashboard > Developers > Webhooks
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Monthly Plan Price ID (starts with price_)
# Get this from Stripe Dashboard > Products > Prices
STRIPE_MONTHLY_PRICE_ID=price_your_monthly_price_id

# Yearly Plan Price ID (starts with price_)
# Get this from Stripe Dashboard > Products > Prices
STRIPE_YEARLY_PRICE_ID=price_your_yearly_price_id

# === Frontend URL ===

# Client/Frontend URL (no trailing slash)
# Used for CORS, Stripe redirects, and Billing Portal return URL
CLIENT_URL=http://localhost:5173

# Note: FRONTEND_URL is deprecated but kept as fallback
# Use CLIENT_URL for all new configurations
```

### Frontend (.env)

```bash
# === Stripe Configuration ===

# Stripe Publishable Key (starts with pk_test_ or pk_live_)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# === API Configuration ===

# Backend API URL (no trailing slash)
VITE_API_URL=http://localhost:5000/api
```

---

## How to Get Stripe Keys

### 1. Stripe Secret and Publishable Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** in the left sidebar
3. Click **API keys**
4. Copy:
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

⚠️ **Never commit secret keys to version control!**

### 2. Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Click **Add endpoint** or select existing endpoint
4. Endpoint URL should be: `https://your-domain.com/api/webhook`
5. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
6. Click **Add endpoint**
7. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 3. Price IDs

#### Option A: Create New Products/Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Products** in the left sidebar
3. Click **Add product**
4. Fill in product details:
   - Name: "DevQuest Premium"
   - Description: "Unlimited access to all courses"
5. Under **Pricing**, click **Add another price**
6. Create two prices:
   - **Monthly**: $9.99/month, recurring
   - **Yearly**: $99.99/year, recurring
7. Save and copy the price IDs (starts with `price_`)
   - Monthly price ID → `STRIPE_MONTHLY_PRICE_ID`
   - Yearly price ID → `STRIPE_YEARLY_PRICE_ID`

#### Option B: Use Existing Products

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Products**
3. Click on your product
4. Find the price you want to use
5. Copy the price ID → environment variable

---

## Testing with Stripe Test Mode

### Test Mode Keys
- Use keys starting with `sk_test_` and `pk_test_`
- No real money is charged
- Use [Stripe test card numbers](https://stripe.com/docs/testing)

### Common Test Cards

```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Requires Authentication: 4000 0025 0000 3155

Expiry: Any future date (e.g., 12/34)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

### Testing Webhooks Locally

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:5000/api/webhook

# This will give you a webhook signing secret for local testing
# Use it for STRIPE_WEBHOOK_SECRET in development
```

---

## Production Checklist

Before deploying to production:

- [ ] Switch to live Stripe keys (`sk_live_`, `pk_live_`)
- [ ] Update `CLIENT_URL` to production frontend URL
- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Create production webhook endpoint in Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` with production webhook secret
- [ ] Test subscription purchase with real card (then refund)
- [ ] Test Billing Portal access
- [ ] Verify webhook events are received
- [ ] Monitor Stripe Dashboard for any errors

---

## Troubleshooting

### "No such price: price_xxx"
- Verify price ID is correct in environment variables
- Ensure you're using the right Stripe account (test vs live)
- Check that the price exists in Stripe Dashboard

### "Webhook signature verification failed"
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure webhook endpoint receives raw body (using `express.raw()`)
- Check webhook is configured in Stripe Dashboard for correct URL

### "CORS error when calling API"
- Verify `CLIENT_URL` matches your frontend URL exactly
- Ensure no trailing slash in `CLIENT_URL`
- Check CORS configuration in `server/server.js`

### "Pricing plans not loading"
- Check backend logs for errors
- Verify Stripe API keys are correct
- Ensure `/api/pricing-plans` endpoint is accessible
- Check network tab in browser for failed requests

---

## Environment Variable Priority

1. `.env.local` (if exists, not tracked in git)
2. `.env` (tracked in git, should only contain example values)

**Best Practice**: 
- Keep `.env` with example/placeholder values for documentation
- Create `.env.local` with real values (add to `.gitignore`)
- Use environment variables from hosting platform in production

---

## Security Notes

⚠️ **CRITICAL SECURITY RULES**

1. **Never commit real API keys to version control**
2. **Always use environment variables for secrets**
3. **Use separate test/live keys for dev/prod**
4. **Regularly rotate API keys (every 90 days)**
5. **Restrict webhook endpoints to Stripe IPs if possible**
6. **Monitor Stripe Dashboard for suspicious activity**

---

_For more information, see [Stripe API Documentation](https://stripe.com/docs/api)_
