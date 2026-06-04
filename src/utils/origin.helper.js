const { URL } = require("url");

function parseOriginHostname(origin) {
    try {
        return new URL(origin).hostname;
    } catch {
        return null;
    }
}

function matchesDomainPattern(originHost, pattern) {
    const base = pattern.replace(/^\*\./, "").replace(/^\./, "").trim();
    if (!base || !originHost) return false;
    return originHost === base || originHost.endsWith(`.${base}`);
}

function isOriginAllowedForHostname(origin, cookieHostname) {
    if (!cookieHostname || !origin) return false;
    const hostname = parseOriginHostname(origin);
    if (!hostname) return false;
    return matchesDomainPattern(hostname, cookieHostname);
}

function isSubdomainOfAllowedEntry(origin, allowedEntry) {
    try {
        const allowedHost = new URL(allowedEntry).hostname;
        const originHost = parseOriginHostname(origin);
        if (!allowedHost || !originHost) return false;
        return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
    } catch {
        return false;
    }
}

function matchesWildcardEntry(origin, entry, { requireHttps = false } = {}) {
    const trimmed = entry.trim();
    if (trimmed === "*") return true;

    if (trimmed.startsWith("*.")) {
        const host = parseOriginHostname(origin);
        if (!host) return false;
        if (requireHttps) {
            try {
                if (new URL(origin).protocol !== "https:") return false;
            } catch {
                return false;
            }
        }
        return matchesDomainPattern(host, trimmed);
    }

    const m = trimmed.match(/^(https?):\/\/\*\.(.+)$/i);
    if (m) {
        const host = parseOriginHostname(origin);
        if (!host) return false;
        try {
            const originUrl = new URL(origin);
            if (requireHttps && originUrl.protocol !== "https:") return false;
            if (originUrl.protocol !== `${m[1].toLowerCase()}:`) return false;
        } catch {
            return false;
        }
        return matchesDomainPattern(host, `*.${m[2]}`);
    }

    return false;
}

function isOriginAllowed(
    origin,
    { allowedOrigins, hostname, isDevelopment, requireHttps = false, corsAllowAll = false }
) {
    if (!origin) return true;
    if (isDevelopment || corsAllowAll) {
        if (requireHttps) {
            try {
                return new URL(origin).protocol === "https:";
            } catch {
                return false;
            }
        }
        return true;
    }

    if (requireHttps) {
        try {
            if (new URL(origin).protocol !== "https:") return false;
        } catch {
            return false;
        }
    }

    const allowedList = (allowedOrigins || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

    if (allowedList.includes(origin)) return true;

    for (const entry of allowedList) {
        if (matchesWildcardEntry(origin, entry, { requireHttps })) return true;
        if (isSubdomainOfAllowedEntry(origin, entry)) return true;
    }

    if (hostname && isOriginAllowedForHostname(origin, hostname)) return true;

    return false;
}

module.exports = {
    isOriginAllowed,
};
