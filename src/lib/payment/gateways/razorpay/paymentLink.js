/**
 * Razorpay Payment Links API adapter.
 * Uses axios for reliable execution of payment link endpoints.
 * API reference: https://razorpay.com/docs/api/payments/payment-links/
 */

const axios = require('axios');
const { GatewayError } = require('@src/lib/payment/errors');

const RAZORPAY_BASE_URL = 'https://api.razorpay.com/v1';

function buildAuthHeader(keyId, keySecret) {
    const token = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    return {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Creates a Razorpay Payment Link (hosted page).
 *
 * @param {object} config - { keyId, keySecret }
 * @param {object} command
 * @param {number} command.amount         - Amount in paise (integer) or major INR
 * @param {string} command.currency       - e.g. 'INR'
 * @param {string} command.description    - Link description
 * @param {object} command.customer       - { name, contact, email? }
 * @param {object} [command.notes]        - key/value map attached to link
 * @param {number} [command.expireBy]     - Unix timestamp
 * @returns {{ id, shortUrl, status, raw }}
 */
async function createPaymentLink(config, command) {
    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) {
        throw new GatewayError('Razorpay credentials not configured', {
            code: 'GATEWAY_NOT_CONFIGURED',
            statusCode: 500,
        });
    }

    // Razorpay requires amount in paise
    const amountInPaise = Math.round(Number(command.amount) * 100);

    const payload = {
        amount: amountInPaise,
        currency: command.currency || 'INR',
        description: (command.description || 'Payment').slice(0, 2048),
        customer: {
            name: command.customer?.name || 'Customer',
            ...(command.customer?.email && { email: command.customer.email }),
            ...(command.customer?.contact && { contact: command.customer.contact }),
            ...(command.customer?.phone && !command.customer?.contact && {
                contact: command.customer.phone.startsWith('+')
                    ? command.customer.phone
                    : `+91${String(command.customer.phone).replace(/\D/g, '').slice(-10)}`,
            }),
        },
        notify: {
            sms: false,
            email: false,
        },
        reminder_enable: false,
        notes: command.notes || {},
    };

    if (command.expireBy) {
        payload.expire_by = command.expireBy;
    }

    try {
        const response = await axios.post(`${RAZORPAY_BASE_URL}/payment_links`, payload, {
            headers: buildAuthHeader(keyId, keySecret),
            timeout: 15000,
        });

        const data = response.data;
        if (!data?.id) {
            throw new GatewayError('Razorpay payment link creation returned invalid response', {
                code: 'INVALID_GATEWAY_RESPONSE',
                statusCode: 502,
            });
        }

        return {
            id: data.id,
            shortUrl: data.short_url || null,
            status: data.status || 'created',
            raw: data,
        };
    } catch (error) {
        if (error instanceof GatewayError) throw error;
        if (error.response) {
            const msg =
                error.response.data?.error?.description ||
                error.response.data?.message ||
                'Razorpay payment link creation failed';
            throw new GatewayError(msg, {
                code: error.response.data?.error?.code || 'RAZORPAY_API_ERROR',
                statusCode: error.response.status >= 500 ? 502 : 400,
            });
        }
        throw new GatewayError(
            error.message || 'Failed to create Razorpay payment link',
            { code: 'RAZORPAY_NETWORK_ERROR', statusCode: 502 }
        );
    }
}

/**
 * Cancels a Razorpay Payment Link.
 *
 * @param {object} config - { keyId, keySecret }
 * @param {string} linkId - Razorpay payment link ID (e.g. plink_xxx)
 */
async function cancelPaymentLink(config, linkId) {
    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) {
        throw new GatewayError('Razorpay credentials not configured', {
            code: 'GATEWAY_NOT_CONFIGURED',
            statusCode: 500,
        });
    }

    try {
        const response = await axios.post(
            `${RAZORPAY_BASE_URL}/payment_links/${encodeURIComponent(linkId)}/cancel`,
            {},
            {
                headers: buildAuthHeader(keyId, keySecret),
                timeout: 15000,
            }
        );
        return { success: true, raw: response.data };
    } catch (error) {
        if (error instanceof GatewayError) throw error;
        if (error.response) {
            const msg =
                error.response.data?.error?.description ||
                error.response.data?.message ||
                'Razorpay payment link cancellation failed';
            throw new GatewayError(msg, {
                code: error.response.data?.error?.code || 'RAZORPAY_CANCEL_ERROR',
                statusCode: error.response.status >= 500 ? 502 : 400,
            });
        }
        throw new GatewayError(
            error.message || 'Failed to cancel Razorpay payment link',
            { code: 'RAZORPAY_NETWORK_ERROR', statusCode: 502 }
        );
    }
}

module.exports = {
    createPaymentLink,
    cancelPaymentLink,
};

