/**
   * Set the private key associated to a specific asset for current session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The asset symbol.
   * @param {string} data.privateKey - The private key.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy', privateKey: '_dummyprivatekey_'}, 'setPrivateKey'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
exports.setPrivateKey = (assets, clientModules, fail) => function (data, dataCallback, errorCallback) {
  this.addAsset(data, () => {
    const symbol = data.symbol;
    const mode = assets[symbol].mode.split('.');
    const baseMode = mode[0];
    if (!clientModules[baseMode].hasOwnProperty('importPrivate')) {
      fail('Asset ' + data.symbol + ' does not support importing of private keys.', errorCallback);
    } else {
      let subMode = mode[1];
      const keys = clientModules[baseMode].importPrivate(data);
      assets[symbol].data.keys = keys;
      assets[symbol].data.keys.mode = subMode;
      assets[symbol].data.publickey = clientModules[baseMode].publickey(assets[symbol].data.keys);
      assets[symbol].data.privatekey = clientModules[baseMode].privatekey(assets[symbol].data.keys);

      const setAddress = address => {
        assets[symbol].data.address = address;
        dataCallback(address);
      };

      const address = clientModules[baseMode].address(assets[symbol].data.keys, setAddress, errorCallback);
      if (typeof address !== 'undefined') {
        setAddress(address);
      }
    }
  }, errorCallback);
};
