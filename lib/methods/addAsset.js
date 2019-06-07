/**
   * Add an asset (crypto currency or token) to the session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} [data.clientModuleCodeBlob] - A string containing the client module code blob.
   * @param {string} [data.host] - The host used for the calls.
   * @param {string} [data.channel] - The channel used for the calls. 'y' for encryped, 'z' for encryped and compresses;
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
exports.addAsset = (assets, fail, clientModules) => function (data, dataCallback, errorCallback) {
  // TODO symbol as array of strings to load multiple?
  if (!assets.hasOwnProperty(data.symbol)) { // if assets has not been iniated, retrieve and initialize
    this.rout({host: data.host, query: '/a/' + data.symbol + '/details', channel: data.channel}, (asset) => {
      if (typeof asset.mode !== 'string') {
        fail('Expected \'mode\' property of string type in asset details.', errorCallback);
        return;
      }
      const mode = asset.mode.split('.')[0];
      if (clientModules.hasOwnProperty(mode)) { // Client Module was already retrieved
        this.initAsset({assetDetails: asset}, dataCallback, errorCallback);
      } else if (data.hasOwnProperty('clientModuleCodeBlob')) {
        this.initAsset({assetDetails: asset, clientModuleCodeBlob: data.clientModuleCodeBlob}, dataCallback, errorCallback);
      } else {
        this.rout({host: data.host, query: '/s/deterministic/code/' + mode, channel: data.channel}, (blob) => {
          this.initAsset({assetDetails: asset, clientModuleCodeBlob: blob}, dataCallback, errorCallback);
        }, errorCallback);
      }
    }, errorCallback);
  } else if (typeof dataCallback === 'function') {
    dataCallback(data.symbol);
  }
};
