const CommonUtils = require('../../common/index');

/**
   * Initialize an asset (crypto currency or token)
   * @category AssetManagement
   * @param {Object} data
   * @param {Object} data.assetDetails - Asset details as retrieved by calling `/a/$SYMBOL/details`
   * @param {string} data.clientModuleCodeBlob - A string containing the client module code blob.
   **/
exports.initAsset = (user_keys, fail, assets, clientModules) => function (data, dataCallback, errorCallback) {
  if (typeof data !== 'object' || data === null || !data.hasOwnProperty('assetDetails')) {
    fail('Missing \'assetDetails\'.', errorCallback);
    return;
  }

  if (!user_keys.boxSk) {
    fail('Cannot initiate asset without a session.', errorCallback);
    return;
  }
  const init = () => {
    const symbol = data.assetDetails.symbol;
    assets[symbol] = data.assetDetails;
    assets[symbol].data = {};
    let mode = data.assetDetails['mode'].split('.');
    const baseMode = mode[0];
    const subMode = mode[1];
    if (!data.assetDetails.hasOwnProperty('keygen-base')) {
      fail('Missing \'keygen-base\' in details.', errorCallback);
      return;
    }
    const baseSymbol = data.assetDetails['keygen-base'];

    const addressCallback = address => {
      assets[symbol].data.address = address;
      if (dataCallback) { dataCallback(data.assetDetails.symbol); }
    };

    const keysCallback = keys => {
      assets[symbol].data.keys = keys;
      assets[symbol].data.keys.mode = subMode;
      assets[symbol].data.publickey = clientModules[baseMode].publickey(assets[symbol].data.keys);
      assets[symbol].data.privatekey = clientModules[baseMode].privatekey(assets[symbol].data.keys);

      const address = clientModules[baseMode].address(assets[symbol].data.keys, addressCallback, errorCallback);
      if (typeof address !== 'undefined') {
        addressCallback(address);
      }
    };

    assets[symbol]['fee-symbol'] = data.assetDetails['fee-symbol'] || symbol;
    assets[symbol]['fee-factor'] = data.assetDetails['fee-factor'];
    assets[symbol].data.seed = CommonUtils.seedGenerator(user_keys, baseSymbol);
    try {
      assets[symbol].data.mode = subMode;
      const keys = clientModules[baseMode].keys(assets[symbol].data, keysCallback, errorCallback);
      if (typeof keys !== 'undefined') {
        keysCallback(keys);
      }
    } catch (e) {
      fail(e, errorCallback);
    }
  };

  if (!clientModules.hasOwnProperty(data.assetDetails['mode'].split('.')[0])) { //  blob was not yet initialized
    const mode = data.assetDetails['mode'].split('.')[0];
    this.import({id: mode, blob: data.clientModuleCodeBlob}, init, errorCallback);
  } else {
    init();
  }
};
