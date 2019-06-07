/**
   * Create a signed transaction using all inputs.
   * @category Transaction
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset.
   * @param {string} data.target - The target address.
   * @param {Number} data.amount - The amount.
   * @param {Number} [data.message] -  Option to add data (message, attachment, op return) to a transaction.
   * @param {Number} [data.fee] - The fee.
   * @param {Number} [data.time] - Provide an explicit timestamp
   * @param {Object} data.unspent - Pretransaction data.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * {symbol: 'dummy', target: '_dummyaddress_', amount:1, unspent: [{"amount":"1","txid":"TXIDTXIDTXIDTXIDTXIDTXIDTXID","txn":1}]}, 'rawTransaction',
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
exports.signTransaction = (fail, assets, clientModules) => function (data, dataCallback, errorCallback) {
  if (!assets.hasOwnProperty(data.symbol)) {
    fail('Asset ' + data.symbol + ' not added.', errorCallback);
    return;
  }
  const asset = assets[data.symbol];
  if (!clientModules.hasOwnProperty(asset['mode'].split('.')[0])) {
    fail('Asset ' + data.symbol + ' not initialized.', errorCallback);
    return;
  }

  if (!asset.hasOwnProperty('factor')) {
    fail('Asset ' + data.symbol + ' missing factor.', errorCallback);
    return;
  }

  if (!asset.hasOwnProperty('fee-factor')) {
    fail('Asset ' + data.symbol + ' missing fee-factor.', errorCallback);
    return;
  }

  if (!data.hasOwnProperty('amount')) {
    fail('Missing \'amount\' property.', errorCallback);
    return;
  }

  const createTransaction = (amount, fee) => {
    const transactionData = {
      mode: asset.data.keys.mode,
      symbol: asset.symbol,
      source: asset.data.address,
      target: data.target,
      amount: amount,
      fee: fee,
      factor: asset.factor,
      contract: asset.contract,
      keys: asset.data.keys,
      seed: asset.data.seed,
      unspent: data.unspent,
      message: data.message,
      time: data.time
    };
    let checkTransaction;
    try {
      const base = asset['mode'].split('.')[0];
      checkTransaction = clientModules[base].transaction(transactionData, dataCallback, errorCallback);
    } catch (e) {
      fail('Transaction failed: ' + e, errorCallback);
      return;
    }
    if (typeof checkTransaction !== 'undefined' && typeof dataCallback === 'function') {
      dataCallback(checkTransaction);
    }
  };

  const atomizeAmount = fee => {
    this.atom({amount: data.amount, factor: asset.factor}, amount => createTransaction(amount, fee), errorCallback);
  };

  const fee = typeof data.fee === 'undefined' ? asset.fee : data.fee;
  // atomize fee
  this.atom({amount: fee, factor: asset['fee-factor']}, atomizeAmount, errorCallback);
};
