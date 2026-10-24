function parseUrl(urlStr) {
    try {
        return new URL(urlStr);
    } catch {
        return null;
    }
}

function matchesDomain(host, domain) {
    if (!host || !domain) return false;
    const base = domain.replace(/^(\*|\.)+/, "").trim();
    if (!base) return false;
    return host === base || host.endsWith(`.${base}`);
}

function isOriginAllowed(origin, options = {}) {
    if (!origin) return true;

    const {
        allowedOrigins = "",
        hostname = "",
        isDevelopment = false,
        requireHttps = false,
        corsAllowAll = false,
    } = options;

    const parsed = parseUrl(origin);
    if (!parsed) return false;

    if (requireHttps && parsed.protocol !== "https:") {
        return false;
    }

    if (isDevelopment || corsAllowAll || allowedOrigins === "*") {
        return true;
    }

    const originHost = parsed.hostname;
    const allowedList = allowedOrigins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (allowedList.includes(origin)) return true;

    for (const entry of allowedList) {
        if (entry === "*") return true;

        // Matches scheme-specific wildcard URL, e.g. "https://*.dragbizz.io"
        const wildcardUrlMatch = entry.match(/^(https?):\/\/\*\.(.+)$/i);
        if (wildcardUrlMatch) {
            const [, scheme, domain] = wildcardUrlMatch;
            if (parsed.protocol === `${scheme.toLowerCase()}:` && matchesDomain(originHost, domain)) {
                return true;
            }
            continue;
        }

        // Matches wildcard domain pattern, e.g. "*.dragbizz.io" or ".dragbizz.io"
        if (entry.startsWith("*.") || entry.startsWith(".")) {
            if (matchesDomain(originHost, entry)) return true;
            continue;
        }

        // Subdomain check if entry is a full URL, e.g. "https://dragbizz.io"
        const entryUrl = parseUrl(entry);
        if (entryUrl && matchesDomain(originHost, entryUrl.hostname)) {
            return true;
        }
    }

    // Server hostname pattern check (e.g. ".dragbizz.io")
    if (hostname && matchesDomain(originHost, hostname)) {
        return true;
    }

    return false;
}

module.exports = {
    isOriginAllowed,
};
