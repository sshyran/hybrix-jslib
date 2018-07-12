var IoC = function () {
  var user_keys;
  /*
    boxPk
    boxSk
  */
  var assets = {};
  /* per symbol:
     {$SYMBOL:
     {
     seed
     keys
     address
     }
     }
  */
  var deterministic = {};
  /*  per keygen-base:
      {$KEYGEN-BASE :
      {
      keys()
      sign()
      ..TODO
      }
      }
  */
  var hybriddNodes = {};

  this.init = function (data, dataCallback, errorCallback) {
    nacl_factory.instantiate(function (naclinstance) {
      nacl = naclinstance; // nacl is a global that is initialized here.
      if (typeof dataCallback === 'function') { dataCallback(); }
    });
  };

  this.logout = function (data, dataCallback, errorCallback) {
    assets = {};
    user_keys = undefined;
    if (typeof dataCallback === 'function') { dataCallback(); }
  };

  this.login = function (data, dataCallback, errorCallback) {
    /* data = {
       username,
       password
       }
    */
    if (!validateUserIDLength(data.username)) {
      if (typeof errorCallback === 'function') {
        errorCallback('Invalid username.');
      }
      return;
    }
    if (!validatePasswordLength(data.password)) {
      if (typeof errorCallback === 'function') {
        errorCallback('Invalid password.');
      }
      return;
    }
    this.logout({}, () => { // first logout clear current data
      user_keys = generateKeys(data.password, data.username, 0);
      if (dataCallback) { dataCallback(); }
    });
  };

  this.initAsset = function (data, dataCallback, errorCallback) {
    /* data = {
       assetDetails,
       deterministicCodeBlob
       }
    */
    deterministic[data.assetDetails['keygen-base']] = activate(LZString.decompressFromEncodedURIComponent(data.deterministicCodeBlob));
    assets[data.assetDetails.symbol] = data.assetDetails;
    assets[data.assetDetails.symbol].data = {};
    assets[data.assetDetails.symbol].data.seed = seedGenerator(user_keys, data.assetDetails['keygen-base']);
    assets[data.assetDetails.symbol].data.keys = deterministic[data.assetDetails['keygen-base']].keys(assets[data.assetDetails.symbol].data);
    assets[data.assetDetails.symbol].data.keys.mode = data.assetDetails.mode.split('.')[1]; // (here submode is named mode confusingly enough)
    assets[data.assetDetails.symbol].data.address = deterministic[data.assetDetails['keygen-base']].address(assets[data.assetDetails.symbol].data.keys);
    if (dataCallback) { dataCallback(data.assetDetails.symbol); }
  };

  this.addAsset = function (data, dataCallback, errorCallback) {
    if (typeof data === 'string') { data = {symbol: data}; }
    /* data = {
       symbol,
       channel,
       options // for call
       }
    */
    this.call({host: data.host, query: 'a/' + data.symbol + '/details', options: data.options, channel: data.channel}, (asset) => {
      var mode = asset.data.mode.split('.')[0];
      // TODO alleen blob ophalen als die nog niet opgehaald is
      this.call({host: data.host, query: 's/deterministic/code/' + mode, options: data.options, channel: data.channel}, (blob) => {
        this.initAsset({assetDetails: asset.data, deterministicCodeBlob: blob.data}, dataCallback, errorCallback);
      }, errorCallback);
    }, errorCallback);
  };
  // TODO addAssets([])

  this.getAddress = function (data, dataCallback, errorCallback) {
    if (typeof data === 'string') { data = {symbol: data}; }
    // data = symbol
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.address);
    } else if (typeof errorCallback === 'function') {
      errorCallback('Asset not initialized');
    }
  };

  this.signTransaction = function (data, dataCallback, errorCallback) {
    /* data =
       {
       symbol
       target
       amount
       fee
       unspent
       }
    */
    // TODO check symbol
    // TODO check amount
    // TODO check target

    if (!assets.hasOwnProperty(data.symbol)) {
      if (typeof errorCallback === 'function') {
        errorCallback('Asset not added.');// TODO error message
      }
      return;
    }
    var asset = assets[data.symbol];
    if (!deterministic.hasOwnProperty(asset['keygen-base'])) {
      if (typeof errorCallback === 'function') {
        errorCallback('Asset not initialized.');// TODO error message
      }
      return;
    }

    // deterministic[assetDetails['keygen-base']]
    var transactionData = {
      mode: asset.data.keys.mode,
      symbol: asset.symbol,
      source: asset.data.address,
      target: data.target,
      amount: data.amount,
      fee: data.fee || asset.fee,
      factor: asset.factor,
      contract: asset.contract,
      keys: asset.data.keys,
      seed: asset.data.seed,
      unspent: data.unspent
    };
    var checkTransaction = deterministic[asset['keygen-base']].transaction(transactionData, dataCallback);// TODO errorCallback
    // TODO dataCallback??
  };

  this.transaction = function (data, dataCallback, errorCallback) {
    /* data =
       {
       symbol
       target
       amount
       fee
       unspent
       }
    */
    this.sequential({steps: [
      {symbol: data.symbol},
      'getAddress',
      address => { return {query: '/a/' + data.symbol + '/unspent/' + address + '/' + data.target + '/' + data.amount + '/public_key'}; },
      'call',
      unspent => { return {symbol: data.symbol, target: data.target, amount: data.amount, fee: data.fee, unspent: unspent.data}; },
      'signTransaction',
      tx => { return { query: '/a/' + data.symbol + '/push/' + tx }; },
      'call'
    ]}, dataCallback, errorCallback);
  };

  this.addHost = function (data, dataCallback, errorCallback) {
    if (typeof data === 'string') { data = {host: data}; }
    /* data =
       {
       host
       options
       }
    */
    // TODO check if valid hostname
    var hybriddNode = new HybriddNode(data.host);
    hybriddNodes[data.host] = hybriddNode;
    hybriddNode.init({userKeys: user_keys, options: data.options}, dataCallback, errorCallback);
  };

  // TODO addHosts([])

  this.call = function (data, dataCallback, errorCallback) {
    /* data =
       {
       host [optional]
       query
       options  [optional]
       channel undefined|'y'|'z'
       }

    */
    var host;
    if (typeof data.host === 'undefined') {
      host = Object.keys(hybriddNodes)[0]; // todo select random
    } else {
      host = data.host;
    }

    // TODO add for y,z chan: error when no session (user_keys) have been created
    if (hybriddNodes.hasOwnProperty(host)) {
      switch (data.channel) {
        case 'y' : hybriddNodes[host].yCall({query: data.query, channel: data.channel, userKeys: user_keys}, dataCallback, errorCallback); break;
        case 'z' : hybriddNodes[host].zCall({query: data.query, channel: data.channel, userKeys: user_keys}, dataCallback, errorCallback); break;
        default : hybriddNodes[host].call(data.query, dataCallback, errorCallback, data.options); break;
      }
    } else if (typeof errorCallback === 'function') {
      errorCallback('Host not initialized');
    }
  };

  this.sequential = (data, successCallback, errorCallback) => {
    if (data.steps.length === 0) {
      successCallback(data);
    } else {
      var step = data.steps[0];
      if (typeof step === 'string') {
        console.log('this.' + step + '(' + JSON.stringify(data.data) + ')');
        this[step](data.data, resultData => {
          this.sequential({data: resultData, steps: data.steps.slice(1)}, successCallback, errorCallback);
        }, errorCallback);
      } else if (typeof step === 'object') {
        console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(step));
        this.sequential({data: step, steps: data.steps.slice(1)}, successCallback, errorCallback);
      } else if (typeof step === 'function') {
        var result = step(data.data);
        console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(result));
        this.sequential({data: result, steps: data.steps.slice(1)}, successCallback, errorCallback);
      }
    }
  };
};
