const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { items } = JSON.parse(event.body);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            success_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?success=true`,
            cancel_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?canceled=true`,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ id: session.id })
        };
    } catch (error) {
        console.error('Checkout error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
