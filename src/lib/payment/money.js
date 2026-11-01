function toMajorAmount(amount) {
    return Number(Number(amount).toFixed(2));
}

function amountsMatch(expected, actual) {
    const left = toMajorAmount(expected);
    const right = toMajorAmount(actual);
    return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.01;
}

function toMinorAmount(amount) {
    return Math.round(toMajorAmount(amount) * 100);
}

module.exports = {
    toMajorAmount,
    toMinorAmount,
    amountsMatch
};
