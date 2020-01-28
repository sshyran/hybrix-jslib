const Decimal = require('../../../common/crypto/decimal-light');
Decimal.set({ precision: 64 });

const hasDifferentFeeSymbol = asset => asset['fee-symbol'] !== asset.symbol;

function testBalance (balance, data, asset) {
  let amount;
  if (!hasDifferentFeeSymbol(asset)) {
    try {
      amount = new Decimal(data.amount).plus((data.hasOwnProperty('fee') ? data.fee : asset.fee));
    } catch (e) {
      return false;
    }
  } else {
    amount = new Decimal(data.amount);
  }
  return amount.lte(new Decimal(balance));
}

function testBaseBalance (baseBalance, data, asset) {
  if (!hasDifferentFeeSymbol(asset)) {
    return true; // it has already been checked in testBalance
  } else {
    const fee = new Decimal((data.hasOwnProperty('fee') ? data.fee : asset.fee));
    return fee.lte(new Decimal(baseBalance));
  }
}

function calcUnspentAmount (data, asset) {
  if (!hasDifferentFeeSymbol(asset)) {
    try {
      return new Decimal(data.amount).plus((data.hasOwnProperty('fee') ? data.fee : asset.fee)).toString();
    } catch (e) {
      return undefined;
    }
  } else {
    return data.amount;
  }
}

function prependValidationSteps (steps, data, asset) {
  steps.unshift(
    // Validate balanse
    {query: '/asset/' + data.symbol + '/balance/' + asset.data.address, host: data.host, channel: data.channel}, 'rout',
    balance => { return {condition: testBalance(balance, data, asset), message: 'Insufficient funds available for transaction: ' + balance + ' ' + asset.symbol + '.'}; }, 'assert',
    // Validate target address
    {query: '/asset/' + data.symbol + '/validate/' + data.target, host: data.host, channel: data.channel}, 'rout',
    valid => { return {condition: valid === 'valid', message: 'Target ' + data.target + ' is not a valid address'}; }, 'assert'
  );
  // Validate Base balance if fee is paid in different symbol (for example tokens)
  if (hasDifferentFeeSymbol(asset)) {
    steps.unshift(
      {query: '/asset/' + asset['fee-symbol'] + '/balance/' + asset.data.address, host: data.host, channel: data.channel}, 'rout',
      baseBalance => { return {condition: testBaseBalance(baseBalance, data, asset), message: 'Insufficient funds available for transaction: ' + baseBalance + ' ' + asset['fee-symbol'] + '.'}; }, 'assert'
    );
  }
}

const validateConstructAndSignRawTransaction = function (asset, data, dataCallback, errorCallback, progressCallback) {
  const steps = [];
  if (data.message && !data.hasOwnProperty('fee')) { // if the transaction has a message and no fee is explicitly specified then calculate te required fee
    const msgBytes = data.message.length ? data.message.length : 0;
    steps.push({query: '/a/' + data.symbol + '/fee/' + msgBytes}, 'rout',
      fee => { data.fee = fee; }); // explicitly specify the fee required for a message of this length.
  }
  if (data.hasOwnProperty('unspent')) { // Use explicitly defined unspents
    steps.push(() => data.unspent);
  } else { // Retrieve unspents
    steps.push(() => { return {query: '/a/' + data.symbol + '/unspent/' + asset.data.address + '/' + calcUnspentAmount(data, asset) + '/' + data.target + (asset.data.publickey ? '/' + asset.data.publickey : '') + '/' + (data.message ? data.message : ''), channel: data.channel, host: data.host}; }, 'rout');
  }
  steps.push( // Construct and sign Transaction
    unspent => {
      return {symbol: data.symbol, target: data.target, amount: data.amount, fee: data.fee, unspent: unspent, message: data.message, time: data.time};
    }, 'signTransaction'
  );
  if (data.validate !== false) {
    prependValidationSteps(steps, data, asset);
  }
  this.sequential(steps, dataCallback, errorCallback, progressCallback);
};

exports.prependValidationSteps = prependValidationSteps;
exports.validateConstructAndSignRawTransaction = validateConstructAndSignRawTransaction;
exports.hasDifferentFeeSymbol = hasDifferentFeeSymbol;
