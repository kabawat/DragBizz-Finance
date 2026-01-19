const SECRET = require("@config/env.config");
const axios = require("axios");

const notificationAxios = axios.create({
    baseURL: SECRET.server.url || "http://localhost",
    headers: {
        accept: "application/json",
        "content-type": "application/json",
    },
    timeout: 30000,
});

module.exports = notificationAxios;

