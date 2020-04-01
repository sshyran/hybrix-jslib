const Decimal = require('../../common/crypto/decimal-light');
Decimal.set({ precision: 64 });

/**
   * Convert decimal numbers to atomic numbers
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.amount -
   * @param {string} data.factor -
   */
exports.atom = fail => function (data, dataCallback, errorCallback) {
  if (!data.hasOwnProperty('amount')) {
    fail('Missing amount', errorCallback);
    return;
  }
  if (!data.hasOwnProperty('factor')) {
    fail('Missing factor', errorCallback);
    return;
  }

  const factor = Number(data.factor);
  let amount, atomicAmount;
  try {
    amount = new Decimal(String(data.amount));
    // important: toFixed(0) rids of scientific notation, e.g. 4.41e+22
    atomicAmount = amount.times('1' + (factor > 1 ? '0'.repeat(factor) : '')).toFixed(0).toString();
  } catch (e) {
    fail(e, errorCallback);
    return;
  }

  if (typeof dataCallback === 'undefined') {
    return atomicAmount;
  } else {
    dataCallback(atomicAmount);
  }
};
