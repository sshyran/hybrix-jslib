function test (test) {
  return typeof test === 'object' && test !== null;
}

function details (details) {
  return typeof details === 'object' && details !== null && details.hasOwnProperty('symbol') && details.hasOwnProperty('name') && details.hasOwnProperty('fee') && typeof details.hasOwnProperty('fee') && details.hasOwnProperty('factor') && details.hasOwnProperty('contract') && details.hasOwnProperty('mode') && details.hasOwnProperty('keygen-base');
}

function valid (valid) {
  return typeof valid === 'string' && valid.startsWith('valid');
}

function balance (balance, details, test) {
  if (details.hasOwnProperty('factor')) {
    const factor = details.factor;
    return typeof balance === 'string' && balance.toString().indexOf('.') !== -1 && balance.split('.')[1].length === Number(factor);
  } else {
    return false;
  }
}

function unspent (unspent) {
  return typeof unspent !== 'undefined' && unspent !== null;
}

function history (history) {
  return typeof history === 'object' && history !== null;// TODO array of strings
}

function sample (sample) {
  return typeof sample === 'object' && sample !== null && sample.hasOwnProperty('address') && sample.hasOwnProperty('transaction');
}

function transaction (transaction) {
  return typeof transaction === 'object' && transaction !== null && transaction.hasOwnProperty('id') && transaction.hasOwnProperty('timestamp') && transaction.hasOwnProperty('amount') && transaction.hasOwnProperty('symbol') && transaction.hasOwnProperty('fee') && transaction.hasOwnProperty('source') && transaction.hasOwnProperty('target') && transaction.hasOwnProperty('confirmed');
}

function sign (sign) {
  return typeof sign === 'string';
}

function signHash (signHash, details, test) {
  if (test.hasOwnProperty('hash')) {
    const testHash = test.hash;
    return signHash === testHash || (testHash === 'dynamic' && signHash !== '00000000');
  } else {
    return false;
  }
}

exports.test = test;
exports.sample = sample;
exports.details = details;

exports.sampleValid = valid;
exports.sampleBalance = balance;
exports.sampleUnspent = unspent;
exports.sampleHistory = history;
exports.sampleTransaction = transaction;
exports.seedValid = valid;
exports.seedBalance = balance;
exports.seedUnspent = unspent;
exports.seedSign = sign;
exports.seedSignHash = signHash;
