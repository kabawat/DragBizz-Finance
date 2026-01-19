// email.service.js
const notificationAxios = require("@utils/axios/notification.instance");
const API_CONFIG = require("@config/api.config");

async function sendEmailService(email, type, payload) {
    try {
        // ✅ Call notification service API
        const requestBody = {
            to: email,
            type: type,
            payload: payload || {},
        };
        
        const response = await notificationAxios.post(API_CONFIG.NOTIFICATION.EMAIL.SEND, requestBody);

        console.log(`✅ Email [${type}] sent successfully to ${email}`);
        return response.data;

    } catch (error) {
        const errorMsg = error.response?.data || error.message;
        console.log(`❌ Email failed for ${email}:`, errorMsg);
        throw new Error(`Email Service Error: ${errorMsg}`);
    }
}

module.exports = sendEmailService;

