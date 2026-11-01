const PDFDocument = require('pdfkit');

// Collect pdfkit chunks into a buffer
function streamToBuffer(doc) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });
}

// Format amount with currency symbol
function formatAmount(amount, currency = 'INR') {
    const num = Number(amount) || 0;
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return `${symbol}${num.toFixed(2)}`;
}

// Format date to readable string
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata',
    });
}

// Generate invoice PDF buffer from payment data
async function generateInvoicePdf(payment) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
            Title: `Invoice - ${payment.orderId}`,
            Author: 'DragBizz',
            Subject: 'Payment Invoice',
            Keywords: 'invoice, payment, DragBizz',
        },
        compress: true,
    });

    const bufferPromise = streamToBuffer(doc);

    // ─── Color palette ────────────────────────────────────────────────────
    const PRIMARY   = '#1a73e8';
    const DARK      = '#1a1a2e';
    const GRAY      = '#666666';
    const LIGHTGRAY = '#f5f5f5';
    const GREEN     = '#1e8449';
    const RED       = '#c0392b';
    const LINE      = '#e0e0e0';

    const pageWidth  = doc.page.width;
    const pageHeight = doc.page.height;
    const margin     = 50;
    const contentW   = pageWidth - margin * 2;

    // ─── HEADER BAND ──────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 90).fill(PRIMARY);

    // Brand name
    doc.font('Helvetica-Bold')
       .fontSize(26)
       .fillColor('#ffffff')
       .text('DragBizz', margin, 25);

    // Sub-caption
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#d0e4ff')
       .text('Business Management Platform', margin, 54);

    // INVOICE label — right aligned
    doc.font('Helvetica-Bold')
       .fontSize(22)
       .fillColor('#ffffff')
       .text('INVOICE', margin, 30, { align: 'right', width: contentW });

    doc.moveDown(0);
    doc.y = 110;

    // ─── INVOICE META ─────────────────────────────────────────────────────
    const metaLeft  = margin;
    const metaRight = margin + contentW / 2 + 10;

    // Left column
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('INVOICE DATE', metaLeft, 115);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text(formatDate(payment.paidAt || payment.createdAt), metaLeft, 127);

    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('ORDER ID', metaLeft, 145);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text(payment.orderId, metaLeft, 157, { width: contentW / 2 - 10 });

    // Right column
    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('INVOICE #', metaRight, 115);
    doc.font('Helvetica').fontSize(10).fillColor(DARK)
       .text(String(payment._id), metaRight, 127, { width: contentW / 2 - 10 });

    doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY).text('STATUS', metaRight, 145);
    const statusColor = payment.status === 'SUCCESS' ? GREEN : RED;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(statusColor)
       .text(payment.status, metaRight, 157);

    // Separator
    doc.moveTo(margin, 185).lineTo(margin + contentW, 185).strokeColor(LINE).lineWidth(1).stroke();

    // ─── CUSTOMER / BILLING INFO ─────────────────────────────────────────
    let y = 200;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY).text('BILLED TO', metaLeft, y);
    y += 14;
    doc.font('Helvetica').fontSize(10).fillColor(DARK);
    doc.text(`User ID: ${payment.userId}`, metaLeft, y);
    y += 14;
    if (payment.agencyId) {
        doc.text(`Agency ID: ${payment.agencyId}`, metaLeft, y);
        y += 14;
    }
    if (payment.metadata?.email) {
        doc.text(`Email: ${payment.metadata.email}`, metaLeft, y);
        y += 14;
    }
    if (payment.metadata?.phone) {
        doc.text(`Phone: ${payment.metadata.phone}`, metaLeft, y);
        y += 14;
    }

    // Payment info — right
    let yR = 200;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY).text('PAYMENT INFO', metaRight, yR);
    yR += 14;
    doc.font('Helvetica').fontSize(10).fillColor(DARK);
    doc.text(`Gateway: ${(payment.gateway || 'N/A').toUpperCase()}`, metaRight, yR, { width: contentW / 2 - 10 });
    yR += 14;
    if (payment.gatewayPaymentId || payment.razorpayPaymentId) {
        doc.text(`Txn ID: ${payment.gatewayPaymentId || payment.razorpayPaymentId}`, metaRight, yR, { width: contentW / 2 - 10 });
        yR += 14;
    }
    if (payment.paymentMethod) {
        doc.text(`Method: ${payment.paymentMethod}`, metaRight, yR);
        yR += 14;
    }
    if (payment.billingCycle) {
        doc.text(`Billing: ${payment.billingCycle}${payment.months ? ` (${payment.months} mo)` : ''}`, metaRight, yR);
        yR += 14;
    }
    if (payment.receipt) {
        doc.text(`Receipt: ${payment.receipt}`, metaRight, yR, { width: contentW / 2 - 10 });
        yR += 14;
    }

    // ─── LINE ITEMS TABLE ─────────────────────────────────────────────────
    y = Math.max(y, yR) + 20;

    // Table header
    doc.rect(margin, y, contentW, 24).fill(DARK);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    doc.text('DESCRIPTION',         margin + 10,          y + 8, { width: contentW * 0.45 });
    doc.text('DETAILS',             margin + contentW * 0.45, y + 8, { width: contentW * 0.25 });
    doc.text('AMOUNT',              margin + contentW * 0.70, y + 8, { width: contentW * 0.28, align: 'right' });
    y += 24;

    const currency = payment.currency || 'INR';
    const rows = [];

    // Base amount
    rows.push({
        desc: payment.metadata?.description || 'Subscription Plan',
        detail: payment.packageId ? `Package: ${payment.packageId}` : '',
        amount: formatAmount(payment.baseAmount, currency),
    });

    // Discount
    if (Number(payment.discountAmount) > 0) {
        rows.push({
            desc: `Discount${payment.couponCode ? ` (${payment.couponCode})` : ''}`,
            detail: payment.discountPercentage ? `${payment.discountPercentage}% off` : '',
            amount: `-${formatAmount(payment.discountAmount, currency)}`,
            negative: true,
        });
    }

    // Tax / GST
    if (Number(payment.taxAmount) > 0) {
        rows.push({
            desc: `GST / Tax`,
            detail: payment.gstPercentage ? `${payment.gstPercentage}%` : '',
            amount: formatAmount(payment.taxAmount, currency),
        });
    }

    // Render rows
    rows.forEach((row, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : LIGHTGRAY;
        doc.rect(margin, y, contentW, 22).fill(bg);

        const textColor = row.negative ? RED : DARK;
        doc.font('Helvetica').fontSize(9).fillColor(textColor);
        doc.text(row.desc,   margin + 10,               y + 7, { width: contentW * 0.45 });
        doc.font('Helvetica').fillColor(GRAY);
        doc.text(row.detail, margin + contentW * 0.45,   y + 7, { width: contentW * 0.25 });
        doc.font('Helvetica-Bold').fillColor(textColor);
        doc.text(row.amount, margin + contentW * 0.70,   y + 7, { width: contentW * 0.28, align: 'right' });
        y += 22;
    });

    // Bottom border of table
    doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor(LINE).lineWidth(1).stroke();

    // ─── TOTAL BOX ────────────────────────────────────────────────────────
    y += 10;
    const totalBoxW = 230;
    const totalBoxX = margin + contentW - totalBoxW;

    doc.rect(totalBoxX, y, totalBoxW, 42).fill(PRIMARY);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff');
    doc.text('TOTAL AMOUNT DUE', totalBoxX + 12, y + 8, { width: totalBoxW - 12 });
    doc.fontSize(15).text(formatAmount(payment.finalAmount, currency), totalBoxX + 12, y + 22, {
        width: totalBoxW - 20,
        align: 'right',
    });

    y += 60;

    // Payment date line
    if (payment.paidAt) {
        doc.font('Helvetica').fontSize(9).fillColor(GRAY)
           .text(`Payment received on ${formatDate(payment.paidAt)}`, margin, y, { align: 'right', width: contentW });
        y += 16;
    }

    // ─── FOOTER ───────────────────────────────────────────────────────────
    const footerY = pageHeight - 60;
    doc.moveTo(margin, footerY).lineTo(margin + contentW, footerY).strokeColor(LINE).lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(GRAY);
    doc.text(
        'Thank you for your business! For support, contact support@dragbizz.io',
        margin,
        footerY + 10,
        { align: 'center', width: contentW }
    );
    doc.text(
        `DragBizz · Generated ${formatDate(new Date())} IST`,
        margin,
        footerY + 24,
        { align: 'center', width: contentW }
    );

    doc.end();
    return bufferPromise;
}

module.exports = { generateInvoicePdf };

