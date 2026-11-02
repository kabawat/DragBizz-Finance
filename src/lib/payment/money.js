function toMinorAmount(amount) {
    if (typeof amount === 'bigint') return NaN;
    let text = String(amount ?? '').trim().replace(/^([+-]?)\./, '$10.');
    if (!text || text.length > 200) return NaN;

    const match = text.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!match) return NaN;

    const exponent = Number(match[4] || 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 100) return NaN;

    try {
        const fraction = match[3] || '';
        const digits = BigInt(match[2] + fraction);
        const shift = 2 + exponent - fraction.length;
        let minor;
        if (shift >= 0) {
            minor = digits * 10n ** BigInt(shift);
        } else {
            const divisor = 10n ** BigInt(-shift);
            minor = (digits + divisor / 2n) / divisor;
        }
        if (match[1] === '-') minor = -minor;
        if (minor > BigInt(Number.MAX_SAFE_INTEGER) || minor < BigInt(-Number.MAX_SAFE_INTEGER)) return NaN;
        return Number(minor);
    } catch {
        return NaN;
    }
}

function toMajorAmount(amount) {
    const minor = toMinorAmount(amount);
    return Number.isFinite(minor) ? minor / 100 : NaN;
}

function amountsMatch(expected, actual) {
    const left = toMajorAmount(expected);
    const right = toMajorAmount(actual);
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.01;
}

module.exports = {
    toMajorAmount,
    toMinorAmount,
    amountsMatch
};
