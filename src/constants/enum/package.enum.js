// Constants for Package/Plan status and billing cycles
const PACKAGE_STATUS = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'DRAFT'];
const BILLING_CYCLE = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

// Defines modules available in valid plans
const PACKAGE_MODULES = [
    'ai',
    'billing',
    'cashbook',
    'customer',
    'customer_payment_gateway',
    'expense',
    'integrations',
    'inventory',
    'invoice',
    'online_store',
    'payment_reminder',
    'product',
    'purchase_order',
    'reports',
    'sales_order',
    'staff',
    'store',
    'supplier',
];

module.exports = {
    PACKAGE_STATUS,
    BILLING_CYCLE,
    CURRENCIES,
    PACKAGE_MODULES
};
