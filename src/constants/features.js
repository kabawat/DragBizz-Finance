/**
 * Hardcoded Feature Constants
 * These are the fixed feature identifiers used across all services
 * DO NOT CHANGE THESE VALUES - They are used for access control and usage tracking
 */

const FEATURES = {
    // Product & Inventory Management
    PRODUCT_MANAGEMENT: 'product_management',
    INVENTORY_MANAGEMENT: 'inventory_management',
    STOCK_MANAGEMENT: 'stock_management',
    
    // Sales & Billing
    INVOICE_MANAGEMENT: 'invoice_management',
    CUSTOMER_MANAGEMENT: 'customer_management',
    
    // Financial Management
    EXPENSE_MANAGEMENT: 'expense_management',
    
    // Purchase & Procurement
    PURCHASE_MANAGEMENT: 'purchase_management',
    SUPPLIER_MANAGEMENT: 'supplier_management',
    BILL_MANAGEMENT: 'bill_management',
    PAYMENT_MANAGEMENT: 'payment_management',
};

// Feature display names (for UI)
const FEATURE_DISPLAY_NAMES = {
    product_management: 'Product Management',
    inventory_management: 'Inventory Management',
    stock_management: 'Stock Management',
    invoice_management: 'Invoice Management',
    customer_management: 'Customer Management',
    expense_management: 'Expense Management',
    purchase_management: 'Purchase Management',
    supplier_management: 'Supplier Management',
    bill_management: 'Bill Management',
    payment_management: 'Payment Management',
};

// Feature to route mapping (for access control)
const FEATURE_ROUTES = {
    product_management: ['/product', '/category', '/price'],
    inventory_management: ['/stock', '/inventory'],
    stock_management: ['/stock'],
    invoice_management: ['/invoices'],
    customer_management: ['/customer'],
    expense_management: ['/expense'],
    purchase_management: ['/purchase-order'],
    supplier_management: ['/supplier'],
    bill_management: ['/supplier-account/bills'],
    payment_management: ['/supplier-account/payments'],
};

// Usage types
const USAGE_TYPES = {
    DAILY_FIXED: 'DAILY_FIXED',           // Fixed limit per day (resets daily)
    DAILY_ROLLING: 'DAILY_ROLLING',      // Daily limit with monthly total, unused quota rolls over
    MONTHLY_TOTAL: 'MONTHLY_TOTAL',      // Total limit per month
    UNLIMITED: 'UNLIMITED'                // No limit
};

module.exports = {
    FEATURES,
    FEATURE_DISPLAY_NAMES,
    FEATURE_ROUTES,
    USAGE_TYPES
};
