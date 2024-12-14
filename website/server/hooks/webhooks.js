// webhooks.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    try {
        const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        console.log(`Received event: ${event.type}`);
        res.status(200).send({received: true});
    } catch (err) {
        console.error('Webhook error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};

module.exports = {handleStripeWebhook};
