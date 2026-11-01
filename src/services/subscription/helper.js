function parseResponse(response) {
    if (!response?.success || !response.subscriptionJson) return null;
    try {
        return JSON.parse(response.subscriptionJson);
    } catch (error) {
        throw new Error(`Core returned an invalid subscription response: ${error.message}`);
    }
}

module.exports = { parseResponse };

