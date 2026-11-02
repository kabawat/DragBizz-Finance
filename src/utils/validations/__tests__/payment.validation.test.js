jest.mock('@src/lib/payment/gateway.factory', () => ({
    getActiveGateway: () => ({
        id: 'razorpay',
        schemaId: 'RAZORPAY',
        requiresCustomerPhone: true,
        requiresCustomerEmail: false,
        validateVerificationInput: (data) => ({ isValid: Boolean(data?.paymentId) }),
    }),
}));

const { validateCreateOrder, validateVerifyPayment } = require('../payment.validation');

describe('payment request validation', () => {
    const validOrder = {
        packageId: '507f1f77bcf86cd799439011',
        months: 1,
        phone: '+919876543210',
    };

    test('accepts a valid order and configured gateway', () => {
        expect(validateCreateOrder({ ...validOrder, gateway: 'razorpay' })).toEqual({
            isValid: true,
            errors: {},
        });
    });

    test('rejects invalid package, unsupported term, and malformed contact fields', () => {
        const result = validateCreateOrder({
            ...validOrder,
            packageId: 'invalid',
            months: 2,
            phone: 'bad',
            email: 'bad',
        });
        expect(result.isValid).toBe(false);
        expect(result.errors).toMatchObject({
            packageId: expect.any(String),
            months: expect.any(String),
            phone: expect.any(String),
            email: expect.any(String),
        });
    });

    test('requires phone when the active gateway needs it', () => {
        const result = validateCreateOrder({ packageId: validOrder.packageId, months: 1 });
        expect(result.errors.phone).toBe('Phone number is required');
    });

    test('uses the active gateway verification contract', () => {
        expect(validateVerifyPayment({ paymentId: 'pay_123' })).toEqual({ isValid: true });
        expect(validateVerifyPayment({})).toEqual({ isValid: false });
    });
});
