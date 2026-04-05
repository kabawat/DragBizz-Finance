// Constants for Package/Plan status and billing cycles
const PACKAGE_STATUS = ['ACTIVE', 'INACTIVE', 'ARCHIVED', 'DRAFT'];
const BILLING_CYCLE = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'];
const CURRENCIES = ['INR', 'USD', 'EUR'];

// Defines modules available in valid plans
const PACKAGE_MODULES = [
    'billing',
    'invoice',
    'product',
    'inventory',
    'customer',
    'supplier',
    'expense',
    'purchase_order',
    'sales_order',
    'staff',
    'reports',
    'analytics',
    'store',
    'ai'
];

module.exports = {
    PACKAGE_STATUS,
    BILLING_CYCLE,
    CURRENCIES,
    PACKAGE_MODULES
};
