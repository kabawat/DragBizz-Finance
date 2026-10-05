function toCustomerId(userId) {
    const cleaned = String(userId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 50);
    if (cleaned.length >= 3) return cleaned;
    return `usr_${cleaned || 'unknown'}`.slice(0, 50);
}

function toPhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    if (digits.length === 10) return digits;
    return null;
}

function paymentMethodFrom(payment) {
    if (!payment) return null;
    if (payment.payment_group) return payment.payment_group;
    if (payment.payment_method && typeof payment.payment_method === 'object') {
        return Object.keys(payment.payment_method)[0] || null;
    }
    return null;
}

module.exports = {
    toCustomerId,
    toPhone,
    paymentMethodFrom
};
