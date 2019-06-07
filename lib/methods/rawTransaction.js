const Decimal = require('../../common/crypto/decimal-light');

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
exports.rawTransaction = assets => function (data, dataCallback, errorCallback, progressCallback) {
  function calcUnspentAmount (data, asset) {
    if (asset['fee-symbol'] === asset.symbol) {
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
    if (asset['fee-symbol'] === asset.symbol) {
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
    if (asset['fee-symbol'] === asset.symbol) {
      return true; // it has already been checked in testBalance
    } else {
      const fee = new Decimal((data.hasOwnProperty('fee') ? data.fee : asset.fee));
      return fee.lte(new Decimal(baseBalance));
    }
  }

  const validateConstructAndSignRawTransaction = () => {
    const asset = assets[data.symbol];
    const steps = [];

    if (data.hasOwnProperty('unspent')) { // Use manual unspents
      steps.push(() => data.unspent);
    } else { // Retrieve unspents
      steps.push(() => { return {query: '/a/' + data.symbol + '/unspent/' + asset.data.address + '/' + calcUnspentAmount(data, assets[data.symbol]) + '/' + data.target + (asset.data.publickey ? '/' + asset.data.publickey : ''), channel: data.channel, host: data.host}; }, 'rout');
    }

    steps.push( // Construct and sign Transaction
      unspent => {
        return {symbol: data.symbol, target: data.target, amount: data.amount, fee: data.fee, unspent: unspent, message: data.message, time: data.time};
      }, 'signTransaction'
    );
    if (data.validate !== false) {
      steps.unshift(
        // Validate balanse
        {query: '/asset/' + data.symbol + '/balance/' + asset.data.address, host: data.host, channel: data.channel}, 'rout',
        balance => { return {condition: testBalance(balance, data, asset), message: 'Insufficient funds available for transaction: ' + balance + ' ' + asset.symbol + '.'}; }, 'assert',
        // Validate target address
        {query: '/asset/' + data.symbol + '/validate/' + data.target, host: data.host, channel: data.channel}, 'rout',
        valid => { return {condition: valid === 'valid', message: 'Target ' + data.target + ' is not a valid address'}; }, 'assert'
      );
      // Validate Base balance if fee is paid in different symbol (for example tokens)
      if (asset.symbol !== asset['fee-symbol']) {
        steps.unshift(
          {query: '/asset/' + asset['fee-symbol'] + '/balance/' + asset.data.address, host: data.host, channel: data.channel}, 'rout',
          baseBalance => { return {condition: testBaseBalance(baseBalance, data, assets[data.symbol]), message: 'Insufficient funds available for transaction: ' + baseBalance + ' ' + asset['fee-symbol'] + '.'}; }, 'assert'
        );
      }
    }
    this.sequential({steps}, dataCallback, errorCallback, progressCallback);
  };
  this.addAsset({symbol: data.symbol, channel: data.channel, host: data.host}, validateConstructAndSignRawTransaction, errorCallback);
};
