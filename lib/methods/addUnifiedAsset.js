/**
   * Add a unified asset TODO
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} data.symbols - The symbol of the asset
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
exports.addUnifiedAsset = assets => function (data, dataCallback, errorCallback, progressCallback) {
  // TODO check data = object
  // TODO check data.symbol
  // TODO check data.symbol does not yet exist
  // TODO check data.symbols

  const steps = {};
  for (let symbol in data.symbols) {
    steps[symbol] = {data: {symbol}, step: 'addAsset'}; // TOOD pass host,channel
  }
  const addUnifiedAsset = () => {
    assets[data.symbol] = {
      symbols: data.symbols,
      fee: [],
      factor: 0,
      mode: [],
      contract: [],
      'keygen-base': [],
      generated: [],
      'fee-symbol': [],
      'fee-factor': [],
      data: {
        keys: [],
        publickey: [],
        privatekey: [],
        address: [],
        seed: [],
        mode: []
      }
    };
    const asset = assets[data.symbol];

    for (let subSymbol in data.symbols) {
      const subAsset = assets[subSymbol];
      asset.fee.push(subAsset.fee);
      asset.contract.push(subAsset.contract);
      asset.generated.push(subAsset.generated);
      asset.mode.push(subAsset.mode);
      asset.factor = Math.max(asset.factor, Number(subAsset.factor)); // get the maximum factor
      asset['fee-factor'].push(subAsset['fee-factor']);
      asset['fee-symbol'].push(subAsset['fee-symbol']);
      asset['keygen-base'].push(subAsset['keygen-base']);
      asset.data.keys.push(subAsset.data.keys);
      asset.data.publickey.push(subAsset.data.publickey);
      asset.data.privatekey.push(subAsset.data.privatekey);
      asset.data.address.push(subAsset.data.address);
      asset.data.seed.push(subAsset.data.seed);
      asset.data.mode.push(subAsset.data.mode);
    }
    dataCallback(data.symbol);
  };
  this.parallel(steps, addUnifiedAsset, errorCallback, progressCallback);
};
