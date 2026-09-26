const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const https = require('https');

async function sendTelegramNotification(customer, cartItems) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) return;

    let message = `🚨 **הזמנה חדשה התקבלה ב-She-Kit!** 🚨\n\n`;
    if (customer) {
        message += `👤 **פרטי לקוח:**\n`;
        message += `• שם: ${customer.name || ''} ${customer.lastName || ''}\n`;
        message += `• כתובת: ${customer.address || ''}, ${customer.city || ''} (מיקוד: ${customer.zip || ''})\n`;
        message += `• מייל: ${customer.email || ''}\n`;
        message += `• טלפון: ${customer.phone || ''}\n`;
        if (customer.notes) message += `• הערות: ${customer.notes}\n`;
    }
    
    message += `\n🛒 **פרטי המוצרים:**\n`;
    let grandTotal = 0;
    
    if (cartItems && Array.isArray(cartItems)) {
        cartItems.forEach((item, index) => {
            message += `\n#${index + 1} - ${item.team || 'קבוצה'} (${item.kit || ''} Kit)\n`;
            message += `• מידה: ${item.size || ''}\n`;
            message += `• שם להדפסה: ${item.name || 'ללא'}\n`;
            message += `• מספר: ${item.number || 'ללא'}\n`;
            message += `• גרסה: ${item.version || ''}\n`;
            message += `• כמות: ${item.quantity || 1}\n`;
            message += `• סה"כ פריט: ${item.total || 0}₪\n`;
            grandTotal += (item.total || 0);
        });
    }

    message += `\n💰 **סכום כולל לתשלום: ${grandTotal}₪**`;

    const data = JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
    });

    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => resolve(body));
        });
        req.on('error', () => resolve());
        req.write(data);
        req.end();
    });
}

exports.handler = async function(event, context) {
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
        });

        // שליחת ההודעה לטלגרם ברגע שהסשן נוצר בהצלחה
        if (customer && items) {
            // שולף את פרטי המוצרים מתוך ה-items של סטרייפ לשליחה לטלגרם
            await sendTelegramNotification(customer, items);
        }

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
