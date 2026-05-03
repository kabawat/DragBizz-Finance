const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const SECRET = require('@src/config/env.config');

const secret = SECRET?.razorpay?.webhookSecret || 'secret';
const payload = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_123',
        order_id: 'order_123'
      }
    }
  }
};

const payloadStr = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

axios.post('http://localhost:4002/webhooks/razorpay', payloadStr, {
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature
  }
}).then(res => console.log('OK', res.data)).catch(err => {
    console.log('Error', err.response && err.response.status, err.response && err.response.data);
});
