/**
   * Get the private key associated to a specific asset for current session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The asset symbol.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'getPrivateKey'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
exports.getPrivateKey = assets => function (data, dataCallback, errorCallback) {
  this.addAsset(data, () => {
    dataCallback(assets[data.symbol].data.privatekey);
  }, errorCallback);
};
