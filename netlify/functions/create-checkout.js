const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items, customer } = JSON.parse(event.body);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            success_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?success=true`,
            cancel_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?canceled=true`,
            customer_email: customer.email,
            shipping_address_collection: {
                allowed_countries: ['IL', 'US', 'GB', 'FR', 'ES', 'DE']
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ id: session.id }),
        };
    } catch (error) {
        console.error('Stripe error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
