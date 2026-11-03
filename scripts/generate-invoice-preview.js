#!/usr/bin/env node

// Generate the production invoice template locally without MongoDB or R2.
const fs = require('fs');
const path = require('path');
const { generateInvoicePdf } = require('../src/lib/pdf/invoice.generator');

const output = path.resolve(process.argv[2] || './tmp/invoice-preview.pdf');
const payment = {
    _id: 'preview-invoice-001',
    orderId: 'order_preview_001',
    invoiceNumber: 'DBZ-INV-202611-PREVIEW',
    userId: 'preview-user',
    agencyId: 'preview-agency',
    packageId: 'premium-plan',
    gateway: 'RAZORPAY',
    gatewayPaymentId: 'pay_preview_001',
    paymentMethod: 'UPI',
    billingCycle: 'MONTHLY',
    months: 1,
    status: 'SUCCESS',
    currency: 'INR',
    baseAmount: 1999,
    discountAmount: 0,
    taxAmount: 0,
    finalAmount: 1999,
    paidAt: new Date(),
    createdAt: new Date(),
    metadata: {
        description: 'Premium subscription',
        packageName: 'Premium',
        customerName: 'Preview Customer',
        agencyName: 'Preview Agency',
        storeName: 'Preview Store',
        email: 'preview@example.com',
        phone: '9999999999',
    },
};

generateInvoicePdf(payment)
    .then((buffer) => {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, buffer);
        console.log(`Invoice preview written to ${output}`);
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
