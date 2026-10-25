const listeners = [];

function onPaymentSettled(handler) {
    if (typeof handler !== 'function') {
        throw new Error('Payment settled handler must be a function');
    }
    listeners.push(handler);
    return () => {
        const index = listeners.indexOf(handler);
        if (index >= 0) listeners.splice(index, 1);
    };
}

async function notifyPaymentSettled(payment) {
    for (const handler of listeners) {
        await handler(payment);
    }
}

module.exports = {
    onPaymentSettled,
    notifyPaymentSettled
};
