const Decimal = require('../../common/crypto/decimal-light');
const LZString = require('../../common/crypto/lz-string');

/**
   * Creates a raw transaction that is signed but not yet pushed to the network. Required assets and inputs are collected accordingly.
   * @category Transaction
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} data.target - The target address
   * @param {Number} data.amount - The amount that should be transferred
   * @param {Number} [data.validate=true] - Validate target address and available funds.
   * @param {Number} [data.message] - Option to add data (message, attachment, op return) to a transaction.
   * @param {Number} [data.unspent] - Manually set the unspent data
   * @param {Number} [data.fee]  - The fee.
   * @param {Number} [data.time]  - Provide an explicit time timestamp.
   * @param {string} [data.host] - The host that should be used.
   * @param {string} [data.channel]  - Indicate the channel 'y' for encryption, 'z' for both encryption and compression
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy', target: '_dummyaddress_', amount:1}, 'rawTransaction',
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */

const hasDifferentFeeSymbol = asset => asset['fee-symbol'] !== asset.symbol;
const isUnifiedAsset = asset => asset.hasOwnProperty('symbols');

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
    const msgBytes = data.message.length;
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

function checkAvailableBalance (subSymbol, subResult, assets) {
  const subAsset = assets[subSymbol];
  if (!hasDifferentFeeSymbol(subAsset)) {
    const availableBalance = new Decimal(subResult.balance).minus(subAsset.fee);
    if (availableBalance.isPositive()) {
      return {balance: availableBalance.toString()};
    } else {
      const feeSymbol = subSymbol.toUpperCase();
      return {error: `Insufficient balance for ${subSymbol}. Available: ${subResult.balance} ${feeSymbol}. Required: ${subAsset.fee} ${feeSymbol}`};
    }
  } else {
    const availableBalance = new Decimal(subResult.feeBalance).minus(subAsset.fee);
    if (availableBalance.isPositive()) {
      return {balance: availableBalance.toString()};
    } else {
      const feeSymbol = subAsset['fee-symbol'].toUpperCase();
      return {error: `Insufficient base balance for ${subSymbol}. Available: ${subResult.feeBalance} ${feeSymbol}. Required: ${subAsset.fee} ${feeSymbol}`};
    }
  }
}

function createSubTransactionStep (subSymbol, targetSubAddress, amount, data) {
  return {data: {
    symbol: subSymbol,
    target: targetSubAddress,
    amount,
    validate: false,
    // TODO     message:
    time: data.time,
    host: data.host,
    channel: data.channel
  },
  step: 'rawTransaction'};
}

const combineSubTransactions = dataCallback => subTransactions => { // subTransactions = {eth:'tx',btc:'tx1'} => 'eth:tx,btc:tx2'
  const combinedCompressedSubTransactions = Object.keys(subTransactions).reduce((transactionString, subSymbol) => {
    const compressedSubTransaction = LZString.compressToEncodedURIComponent(subTransactions[subSymbol]);
    return transactionString + (transactionString ? ',' : '') + subSymbol + ':' + compressedSubTransaction;
  }, '');
  dataCallback(combinedCompressedSubTransactions);
};

const createUnifiedTransaction = (assets, targetSubAddresses, data) => function (subResults, dataCallback, errorCallback, progressCallback) {
  let totalAvailableBalance = new Decimal(0);
  const errors = [];
  const availableBalances = {};
  for (let subSymbol in subResults) {
    const subResult = subResults[subSymbol];
    if (!subResult.validate && data.validate) {
      errors.push(`Invalid address for ${subSymbol} : ${targetSubAddresses[subSymbol]}`);
    } else {
      const availableBalance = checkAvailableBalance(subSymbol, subResult, assets);
      if (availableBalance.error) {
        errors.push(availableBalance.error);
      } else {
        availableBalances[subSymbol] = availableBalance.balance;
        totalAvailableBalance = totalAvailableBalance.plus(subResult.balance);
      }
    }
  }

  if (totalAvailableBalance.gte(data.amount)) {
    let cummulativeBalance = new Decimal(0);
    const subTransactionSteps = {};
    for (let subSymbol in availableBalances) {
      const subBalance = availableBalances[subSymbol];
      const delta = cummulativeBalance.plus(subBalance).minus(data.amount); // a+b+c+d-amount
      if (delta.isZero()) { // including the balance of this sub asset the cummulative amount is exactly the requested amount
        subTransactionSteps[subSymbol] = createSubTransactionStep(subSymbol, targetSubAddresses[subSymbol], subBalance, data);
        break;
      } else if (delta.isNegative()) { // including the balance of this sub asset the cummulative amount is not yet enough
        subTransactionSteps[subSymbol] = createSubTransactionStep(subSymbol, targetSubAddresses[subSymbol], subBalance, data);
      } else { // including the balance of this sub asset the cummulative amount is more than enough
        subTransactionSteps[subSymbol] = createSubTransactionStep(subSymbol, targetSubAddresses[subSymbol], delta.toString(), data);
        break;
      }
    }

    this.parallel(subTransactionSteps, combineSubTransactions(dataCallback), errorCallback, progressCallback);
  } else {
    const symbol = data.symbol.toUpperCase();
    errors.push(`Insufficient total balance for ${symbol}. Available: ${totalAvailableBalance.toString()} ${symbol}. Requested: ${data.amount} ${symbol}`);
    errorCallback(errors.join('\n'));
  }
};

function parseTargetAdresses (target) {
  const targetSubAddressPairs = target.split(',').map(x => x.split(':')); // 'btc:123,eth:456' -> ['btc:123','eth:456'] -> [['btc','123'],['eth','456']]
  const targetSubAddresses = {};
  for (let targetSubAddressPair of targetSubAddressPairs) { // [['btc','123'],['eth','456']] -> {btc:'123',eth:'456'}
    const [subSymbol, targetSubAddress] = targetSubAddressPair;
    targetSubAddresses[subSymbol] = targetSubAddress;
  }
  return targetSubAddresses;
}

function unifiedValidationSteps (subAsset, subSymbol, targetSubAddress, data) {
  const subSteps = {
    // Query balance for sub symbol
    balance: {data: {query: '/asset/' + subSymbol + '/balance/' + subAsset.data.address, host: data.host, channel: data.channel}, step: 'rout'}
  };
  if (data.validate) {
    // Validate target sub address
    subSteps.validate = {data: {query: '/asset/' + subSymbol + '/validate/' + targetSubAddress, host: data.host, channel: data.channel}, step: 'rout'};
  }
  if (hasDifferentFeeSymbol(subAsset)) {
    // Query Fee balance for sub base symbol if the fee symbol is different from the subsymbol
    subSteps.feeBalance = {data: {query: '/asset/' + subAsset['fee-symbol'] + '/balance/' + subAsset.data.address, host: data.host, channel: data.channel}, step: 'rout'};
  }
  return subSteps;
}

const assetHasBeenAdded = (assets, data, dataCallback, errorCallback, progressCallback) => function () {
  const asset = assets[data.symbol];

  if (isUnifiedAsset(asset)) {
    const targetSubAddresses = parseTargetAdresses(data.target);
    const targetSubSymbols = Object.keys(targetSubAddresses);
    const subSymbols = asset.symbols;

    targetSubSymbols.filter(x => subSymbols.hasOwnProperty(x)); // only use target addresses for symbols that are unified by this asset
    // TODO provide option to sort on cheapest fee:  targetSubSymbols.sort((a, b) => { return assets[a].fee - assets[b].feereturn ; });

    const steps = {};
    for (let subSymbol of targetSubSymbols) {
      const subAsset = assets[subSymbol];
      const targetSubAddress = targetSubAddresses[subSymbol];
      steps[subSymbol] = {data: unifiedValidationSteps(subAsset, subSymbol, targetSubAddress, data), step: 'parallel'};
    }

    this.sequential([
      steps, 'parallel',
      subResults => { return {func: createUnifiedTransaction(assets, targetSubAddresses, data).bind(this), data: subResults}; }, 'call'
    ],
    dataCallback, errorCallback, progressCallback
    );
  } else {
    validateConstructAndSignRawTransaction.call(this, asset, data, dataCallback, errorCallback, progressCallback);
  }
};

exports.rawTransaction = assets => function (data, dataCallback, errorCallback, progressCallback) {
  const followUpCallback = assetHasBeenAdded(assets, data, dataCallback, errorCallback, progressCallback).bind(this);
  this.addAsset({symbol: data.symbol, channel: data.channel, host: data.host}, followUpCallback, errorCallback);
};
