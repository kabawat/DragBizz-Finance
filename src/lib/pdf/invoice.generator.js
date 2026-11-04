const PDFDocument = require('pdfkit');
const path = require('path');

function streamToBuffer(doc) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
    });
}
const val = v => v === undefined || v === null || String(v).trim() === '' ? '' : String(v);
const short = (v, max = 42) => { const s = val(v); return s.length > max ? `${s.slice(0, max - 1)}...` : s; };
function money(v, currency = 'INR') {
    const n = Number(v); if (!Number.isFinite(n)) return '';
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹';
    return symbol + n.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function date(v, time = true) {
    if (!v) return ''; const d = new Date(v); if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}), timeZone: 'Asia/Kolkata' });
}
function words(v) {
    const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < 0 || n > 999999999) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = x => x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? ` ${ones[x % 10]}` : ''}`;
    const group = x => { const a = []; if (Math.floor(x / 10000000)) a.push(`${two(Math.floor(x / 10000000))} Crore`); x %= 10000000; if (Math.floor(x / 100000)) a.push(`${two(Math.floor(x / 100000))} Lakh`); x %= 100000; if (Math.floor(x / 1000)) a.push(`${two(Math.floor(x / 1000))} Thousand`); x %= 1000; if (Math.floor(x / 100)) a.push(`${ones[Math.floor(x / 100)]} Hundred`); x %= 100; if (x) a.push(two(x)); return a.join(' '); };
    return `${group(n) || 'Zero'} Only`;
}

async function generateInvoicePdf(payment) {
    const doc = new PDFDocument({ size: 'A4', margin: 48, compress: true, info: { Title: `Invoice - ${payment.orderId || 'Subscription'}`, Author: 'DragBizz', Subject: 'Subscription Payment Invoice' } });
    const result = streamToBuffer(doc);
    doc.registerFont('InvoiceUnicode', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    const C = { blue: '#1769d1', dark: '#10233d', gray: '#52647a', light: '#f5f8fc', line: '#d9e1eb', green: '#2d8061', greenBg: '#e5f5ed' };
    const W = doc.page.width, left = 48, width = W - 96, right = W - 48, half = width / 2, meta = payment.metadata || {};
    const currency = payment.currency || 'INR', status = val(payment.status), paidDate = date(payment.paidAt || payment.createdAt), invoiceDate = date(payment.paidAt || payment.createdAt, false);
    const invoiceNo = short(payment.invoiceNumber || (payment.orderId ? `DBZ-INV-${payment.orderId}` : ''));

    doc.rect(0, 0, W, 3).fill(C.blue);
    const logoPath = path.resolve(__dirname, '../../../../../fe/DragBizz-Web/public/DragBizz-Logos/logo.png');
    try { doc.image(logoPath, left, 28, { fit: [36, 36], align: 'center', valign: 'center' }); } catch (_) { doc.roundedRect(left, 28, 36, 36, 8).fill(C.blue); doc.font('Helvetica-Bold').fontSize(17).fillColor('#fff').text('D', left + 12, 36); }
    doc.font('Helvetica-Bold').fontSize(17).fillColor(C.dark).text('DragBizz', left + 46, 29);
    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Business Management Platform', left + 46, 49);
    if (meta.companyAddress) doc.text(short(meta.companyAddress, 62), left + 46, 64);
    if (meta.gstin) doc.text(`GSTIN: ${short(meta.gstin, 24)}`, left + 46, 76);
    doc.font('Helvetica-Bold').fontSize(22).fillColor(C.blue).text('Invoice', left, 28, { width, align: 'right' });
    if (invoiceNo) doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(invoiceNo, left, 54, { width, align: 'right' });

    let y = 120; doc.moveTo(left, y).lineTo(right, y).strokeColor(C.line).stroke();
    [['Invoice date', invoiceDate], ['Order ID', short(payment.orderId)], ['Status', status]].forEach(([label, text], i) => {
        if (!text) return; const x = left + i * width / 3;
        doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(label, x, y + 22);
        if (label === 'Status' && status.toUpperCase() === 'SUCCESS') { doc.roundedRect(x, y + 38, 43, 16, 8).fill(C.greenBg); doc.circle(x + 8, y + 46, 2.5).fill(C.green); doc.font('Helvetica-Bold').fontSize(8).fillColor(C.green).text('Paid', x + 14, y + 42); }
        else doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark).text(text, x, y + 38);
    });
    y = 197; doc.moveTo(left, y).lineTo(right, y).strokeColor(C.line).stroke();

    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Billed to', left, y + 20);
    const customer = short(meta.customerName || payment.customerName);
    if (customer) doc.font('Helvetica-Bold').fontSize(10).fillColor(C.dark).text(customer, left, y + 38);
    const billing = [meta.agencyName && meta.storeName ? `${meta.agencyName} · ${meta.storeName}` : (meta.agencyName || meta.storeName), meta.email, meta.phone].filter(val);
    billing.forEach((line, i) => doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.gray).text(short(line, 44), left, y + 54 + i * 14));
    const paymentX = left + half + 12;
    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Payment details', paymentX, y + 20);
    const payments = [['Transaction ID', payment.gatewayPaymentId || payment.razorpayPaymentId], ['Paid on', paidDate]].filter(([, v]) => val(v));
    payments.forEach(([label, text], i) => { doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(label, paymentX, y + 38 + i * 28); doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark).text(short(text, 34), paymentX, y + 50 + i * 28); });

    y = 328; doc.moveTo(left, y).lineTo(right, y).strokeColor(C.line).stroke(); doc.rect(left, y + 25, width, 30).fill(C.light);
    doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Description', left + 10, y + 37).text('Billing period', left + 192, y + 37).text('Amount', right - 52, y + 37, { width: 42, align: 'right' });
    const packageName = val(meta.packageName || meta.description), period = payment.startDate && payment.endDate ? `${date(payment.startDate, false)} – ${date(payment.endDate, false)}` : (payment.billingCycle ? `${payment.billingCycle}${payment.months ? ` (${payment.months} mo)` : ''}` : '');
    if (packageName || period || money(payment.baseAmount, currency)) { doc.font('Helvetica-Bold').fontSize(9).fillColor(C.dark).text(short(packageName, 38), left + 10, y + 73); if (period) doc.font('Helvetica').text(period, left + 192, y + 73); doc.font('InvoiceUnicode').fontSize(9).fillColor(C.dark).text(money(payment.baseAmount, currency), right - 70, y + 73, { width: 60, align: 'right' }); if (payment.billingCycle) doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Subscription', left + 10, y + 89); }
    y += 116; doc.moveTo(left, y).lineTo(right, y).strokeColor(C.line).stroke();

    const summaryX = left + half + 12, subtotal = Number(payment.baseAmount) - Number(payment.discountAmount || 0), tax = Number(payment.taxAmount || 0), total = Number(payment.finalAmount);
    if (words(total)) { doc.font('Helvetica').fontSize(8).fillColor(C.gray).text('Amount in words', left, y + 20); doc.font('Helvetica-Bold').fillColor(C.dark).text(`Rupees ${words(total)}`, left, y + 36, { width: half - 18 }); }
    [['Subtotal', subtotal], ['GST / Tax', tax]].forEach(([label, amount], i) => { if (!Number.isFinite(amount) || (i === 1 && amount === 0)) return; doc.font('Helvetica').fontSize(8).fillColor(C.gray).text(label, summaryX, y + 20 + i * 24); doc.font('InvoiceUnicode').fontSize(8).fillColor(C.dark).text(money(amount, currency), summaryX + 145, y + 20 + i * 24, { width: 70, align: 'right' }); });
    const totalY = y + 68; doc.roundedRect(summaryX, totalY, half - 12, 58, 6).fill(C.blue); doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff').text(status.toUpperCase() === 'SUCCESS' ? 'Total paid' : 'Total amount', summaryX + 14, totalY + 22); doc.font('InvoiceUnicode').fontSize(17).fillColor('#fff').text(money(total, currency), summaryX + 14, totalY + 16, { width: half - 28, align: 'right' });
    if (status.toUpperCase() === 'SUCCESS') { doc.save().rotate(-7, left + 28, totalY + 34); doc.roundedRect(left, totalY + 12, 80, 38, 6).lineWidth(2).strokeColor(C.green).stroke(); doc.font('Helvetica-Bold').fontSize(14).fillColor(C.green).text('PAID', left + 14, totalY + 23); doc.restore(); }
    const notesY = totalY + 84; doc.moveTo(left, notesY).lineTo(right, notesY).dash(2, { space: 3 }).strokeColor(C.line).stroke().undash(); doc.font('Helvetica-Bold').fontSize(8).fillColor(C.dark).text('Notes', left, notesY + 18); doc.font('Helvetica').fontSize(7).fillColor(C.gray).text('• This is a computer-generated invoice and does not need a signature.', left, notesY + 34).text('• Your plan renews automatically unless you cancel it from your account.', left, notesY + 47);
    const footerY = doc.page.height - 88; doc.moveTo(left, footerY - 12).lineTo(right, footerY - 12).strokeColor(C.line).stroke(); doc.font('Helvetica-Bold').fontSize(7).fillColor(C.dark).text('Thank you for your business.', left, footerY + 2, { width: 165, align: 'right' }); doc.font('Helvetica').fillColor(C.gray).text(' Questions about this invoice? Write to support@dragbizz.io', left + 168, footerY + 2);
    doc.end(); return result;
}

module.exports = { generateInvoicePdf };
