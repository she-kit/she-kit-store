const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const https = require('https');

// פונקציית עזר לשליחת הודעה לטלגרם
async function sendTelegramNotification(customer, cartItems) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.error('Telegram credentials are missing in environment variables.');
        return;
    }

    let message = `🚨 **הזמנה חדשה התקבלה ב-She-Kit!** 🚨\n\n`;
    
    if (customer) {
        message += `👤 **פרטי לקוח:**\n`;
        message += `• שם: ${customer.name || ''} ${customer.lastName || ''}\n`;
        message += `• כתובת: ${customer.address || ''}, ${customer.city || ''} (מיקוד: ${customer.zip || ''})\n`;
        message += `• מייל: ${customer.email || ''}\n`;
        message += `• טלפון: ${customer.phone || ''}\n`;
        if (customer.notes) {
            message += `• הערות: ${customer.notes}\n`;
        }
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

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end4', () => resolve(body));
            res.on('end', () => {
                console.log('Telegram response:', body);
                resolve(body);
            });
        });

        req.on('error', (error) => {
            console.error('Telegram send error:', error);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const bodyData = JSON.parse(event.body);
        console.log('Received body data:', bodyData);

        const { items, customer, cartItems } = bodyData;

        // יצירת סשן תשלום מול Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: items,
            mode: 'payment',
            success_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?success=true`,
            cancel_url: `${event.headers.origin || 'https://she-kit.netlify.app'}/?canceled=true`,
        });

        // שליחת ההודעה לטלגרם
        if (customer) {
            try {
                await sendTelegramNotification(customer, cartItems);
                console.log('Telegram notification sent successfully.');
            } catch (telegramError) {
                console.error('Failed to send telegram notification:', telegramError);
            }
        } else {
            console.warn('Customer data is missing, skipping telegram notification.');
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
