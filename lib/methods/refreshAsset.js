const Decimal = require('../../common/crypto/decimal-light');

function updateBalance (symbol, asset) {
  return {data: [
    {query: '/a/' + symbol + '/balance/' + asset.data.address}, 'rout',
    balance => { asset['balance'] = balance; return balance; }
  ],
  step: 'sequential'};
}

/**
   * Update the balance of a given asset (or all assets if no symbol is defined)
   * @category AssetManagement
   * @param {Object} data
   * @param {string} [data.symbol] - The symbol of the asset to be refreshed, leave undefined to refresh all assets.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * {symbol: 'dummy'}, 'refreshAsset',
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
exports.refreshAsset = assets => function (data, dataCallback, errorCallback, progressCallback) {
  const steps = {};
  const assetList = {};
  if (data.hasOwnProperty('symbol')) {
    if (data.symbol instanceof Array) {
      for (let symbol of data.symbol) {
        assetList[symbol] = true;
      }
    } else if (assets[data.symbol] && assets[data.symbol].hasOwnProperty('symbols')) {
      assetList[data.symbol] = true; // add the unified symbol
      for (let subSymbol in assets[data.symbol].symbols) {
        assetList[subSymbol] = false; // add the subSymbols but set visibility to false
      }
    } else {
      assetList[data.symbol] = true; // use the provided symbol
    }
  } else { // use all assets
    for (let symbol in assets) {
      assetList[symbol] = true;
    }
  }
  // Update the regular balances
  for (let symbol in assetList) {
    if (assets.hasOwnProperty(symbol)) {
      const asset = assets[symbol];
      if (!asset.hasOwnProperty('symbols')) {
        steps[symbol] = updateBalance(symbol, asset);
      }
    }
  }

  const handleUndefineds = data => {
    // Update the unified balances
    for (let symbol in assetList) {
      if (assets.hasOwnProperty(symbol)) {
        const asset = assets[symbol];
        if (asset.hasOwnProperty('symbols')) {
          let balance = new Decimal(0);
          for (let subSymbol in asset.symbols) {
            const weight = asset.symbols[subSymbol];
            const weightedSubBalance = new Decimal(assets[subSymbol].balance).times(weight);
            balance = balance.plus(weightedSubBalance);
          }
          asset.balance = this.form({amount: balance.toString(), factor: asset.factor});
        }
      }
    }

    const returnList = [];
    for (let symbol in assetList) {
      if (assets.hasOwnProperty(symbol)) {
        if (assetList[symbol]) { returnList.push(symbol); } // only add visible assets to return list
        if (typeof assets[symbol].balance === 'undefined') { // if no balance is available set to n/a
          assets[symbol].balance = 'n/a';
        }
      }
    }
    this.asset(returnList, dataCallback, errorCallback, progressCallback);
  };
  this.parallel(steps, handleUndefineds, errorCallback, progressCallback);
};
