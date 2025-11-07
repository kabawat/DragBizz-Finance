function validateAmount(amount) {
    if (typeof amount !== 'number') {
        return { isValid: false, error: 'Amount must be a number' };
    }

    if (isNaN(amount) || !isFinite(amount)) {
        return { isValid: false, error: 'Amount must be a valid number' };
    }

    if (amount < 0) {
        return { isValid: false, error: 'Amount cannot be negative' };
    }

    if (amount === 0) {
        return { isValid: false, error: 'Amount must be greater than zero' };
    }

    if (amount > 100000000) {
        return { isValid: false, error: 'Amount exceeds maximum limit' };
    }

    const decimalPlaces = (amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
    }

    return { isValid: true };
}

function validateAmountBreakdown(baseAmount, discountAmount, taxAmount, finalAmount) {
    const calculatedFinal = baseAmount - discountAmount + taxAmount;
    const tolerance = 0.01;

    if (Math.abs(calculatedFinal - finalAmount) > tolerance) {
        return {
            isValid: false,
            error: 'Amount breakdown mismatch'
        };
    }

    return { isValid: true };
}

module.exports = {
    validateAmount,
    validateAmountBreakdown
};

