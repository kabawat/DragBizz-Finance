const { PACKAGE_MODULES } = require('./enum/package.enum');

// Feature keys — must match PACKAGE_MODULES / Core FEATURES
const FEATURES = {
    AI: 'ai',
    BILLING: 'billing',
    CASHBOOK: 'cashbook',
    CUSTOMER: 'customer',
    CUSTOMER_PAYMENT_GATEWAY: 'customer_payment_gateway',
    EXPENSE: 'expense',
    INTEGRATIONS: 'integrations',
    INVENTORY: 'inventory',
    INVOICE: 'invoice',
    ONLINE_STORE: 'online_store',
    PAYMENT_REMINDER: 'payment_reminder',
    PRODUCT: 'product',
    PURCHASE_ORDER: 'purchase_order',
    REPORTS: 'reports',
    SALES_ORDER: 'sales_order',
    STAFF: 'staff',
    STORE: 'store',
    SUPPLIER: 'supplier',
};

// Feature display names (for UI / package serialization)
const FEATURE_DISPLAY_NAMES = {
    ai: 'AI Suite',
    billing: 'Billing',
    cashbook: 'Cashbook',
    customer: 'Customer Tracking',
    customer_payment_gateway: 'Customer Payment Gateway',
    expense: 'Expense Tracking',
    integrations: 'Integrations',
    inventory: 'Inventory Management',
    invoice: 'Invoicing',
    online_store: 'Online Store',
    payment_reminder: 'Payment Reminders',
    product: 'Product Catalog',
    purchase_order: 'Purchase Orders',
    reports: 'Reports & Analytics',
    sales_order: 'Sales Orders',
    staff: 'Staff Accounts',
    store: 'Store Management',
    supplier: 'Supplier Management',
};

// Feature to route mapping (for access control)
const FEATURE_ROUTES = {
    store: ['/store'],
    product: ['/product', '/category', '/price', '/brand', '/variant'],
    inventory: ['/stock', '/inventory'],
    invoice: ['/invoices', '/pos'],
    customer: ['/customer'],
    expense: ['/expense'],
    cashbook: ['/cashbook'],
    purchase_order: ['/purchase-order'],
    sales_order: ['/sales-order'],
    supplier: ['/supplier'],
    billing: ['/supplier-account/bills', '/supplier-account/payments'],
    payment_reminder: ['/customer-account/reminders'],
    staff: ['/staff'],
    reports: ['/reports', '/analytics', '/gst'],
    online_store: ['/online-store', '/ecommerce'],
    customer_payment_gateway: ['/payment-gateway', '/customer-account/payments/collect-link'],
    integrations: ['/integrations'],
    ai: ['/ai', '/voice'],
};

// Usage types
const USAGE_TYPES = {
    DAILY_FIXED: 'DAILY_FIXED',
    DAILY_ROLLING: 'DAILY_ROLLING',
    MONTHLY_TOTAL: 'MONTHLY_TOTAL',
    TOTAL: 'TOTAL',
    UNLIMITED: 'UNLIMITED',
};

/** Capabilities that Premium (largest) packages must include per module */
const PREMIUM_CAPABILITY_INCLUDES = {
    invoice: ['pos', 'release', 'draft'],
    inventory: ['fifo', 'batches', 'stock_events'],
    reports: ['gst', 'tally', 'sales_summary', 'sales_prediction', 'profit_loss', 'stock_forecast'],
    ai: ['voice', 'chat', 'assistant'],
};

function assertPremiumFeaturesComplete(features = []) {
    const modules = new Set((features || []).map((f) => f.module));
    const missingModules = PACKAGE_MODULES.filter((m) => !modules.has(m));
    const missingCapabilities = [];

    for (const [module, required] of Object.entries(PREMIUM_CAPABILITY_INCLUDES)) {
        const feature = (features || []).find((f) => f.module === module);
        const includes = Array.isArray(feature?.metadata?.includes)
            ? feature.metadata.includes
            : [];
        for (const cap of required) {
            if (!includes.includes(cap)) {
                missingCapabilities.push(`${module}:${cap}`);
            }
        }
    }

    return { missingModules, missingCapabilities, ok: missingModules.length === 0 && missingCapabilities.length === 0 };
}

module.exports = {
    FEATURES,
    FEATURE_DISPLAY_NAMES,
    FEATURE_ROUTES,
    USAGE_TYPES,
    PREMIUM_CAPABILITY_INCLUDES,
    assertPremiumFeaturesComplete,
};
