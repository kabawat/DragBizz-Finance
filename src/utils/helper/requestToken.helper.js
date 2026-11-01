function getAuthorizationToken(req) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== "string") return null;
    const trimmed = authHeader.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith("bearer ")) {
        return null;
    }
    return trimmed;
}

function hasSessionCookie(cookieJar) {
    return Boolean(cookieJar?.at || cookieJar?.["__Host-at"] || cookieJar?.rt);
}

function isWebBrowserRequest(req, cookies) {
    const headers = req?.headers || {};
    if (headers["sec-fetch-site"] || headers["sec-fetch-mode"]) {
        return true;
    }

    const cookieJar = cookies || req?.cookies;
    if (hasSessionCookie(cookieJar) && !getAuthorizationToken(req)) {
        return true;
    }

    return false;
}

function getAccessTokenFromRequest(req, cookies) {
    const cookieJar = cookies || req.cookies;
    if (isWebBrowserRequest(req, cookieJar)) {
        return cookieJar?.at || cookieJar?.["__Host-at"] || null;
    }
    return getAuthorizationToken(req);
}

module.exports = {
    isWebBrowserRequest,
    getAuthorizationToken,
    getAccessTokenFromRequest,
};
