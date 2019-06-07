let Decimal = require('../../common/crypto/decimal-light');

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
  const amount = new Decimal(String(data.amount));
  const atomicAmount = amount.times('1' + (factor > 1 ? '0'.repeat(factor) : '')).toString();
  if (typeof dataCallback === 'undefined') {
    return atomicAmount;
  } else {
    dataCallback(atomicAmount);
  }
};
