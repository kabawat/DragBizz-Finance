const { pipeHash } = require('@src/lib/payment/form');

function requestHash(fields, salt) {
    return pipeHash([
        fields.key, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email,
        fields.udf1 || '', fields.udf2 || '', fields.udf3 || '', fields.udf4 || '', fields.udf5 || '',
        fields.udf6 || '', fields.udf7 || '', fields.udf8 || '', fields.udf9 || '', fields.udf10 || '',
        salt
    ]);
}

function responseHash(fields, salt) {
    return pipeHash([
        salt, fields.status || '',
        fields.udf10 || '', fields.udf9 || '', fields.udf8 || '', fields.udf7 || '', fields.udf6 || '',
        fields.udf5 || '', fields.udf4 || '', fields.udf3 || '', fields.udf2 || '', fields.udf1 || '',
        fields.email || '', fields.firstname || '', fields.productinfo || '', fields.amount || '',
        fields.txnid || '', fields.key || ''
    ]);
}

module.exports = {
    requestHash,
    responseHash
};
