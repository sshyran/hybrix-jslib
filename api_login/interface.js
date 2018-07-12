/**
 * Internet of Coins main API interface object
 * @example
 * var ioc = new IoC();
 *
 * function onSucces(){
 *  console.error('Done.');
 * }
 *
 * function onError(){
 *   console.error('Oops, something went wrong!');
 * }
 *
 * ioc.init(null, onSucces, onError);
 * @example
 * var ioc = new IoC();
 *
 * ioc.sequential([
 *   'init', // Initialize ioc
 *   {username: '****************', password: '****************'}, // Define credentials
 *   'login', // Do the login
 *   {host: 'http://localhost:1111/'}, // Define the host
 *   'addHost', // Add and initialize the host
 *   {symbol: 'dummy'}, // Define the asset
 *   'addAsset', // Add and initialize the asset
 *   {symbol: 'dummy', amount: 100}, // Define the transaction
 *   'transaction' // Execute the transaction
 * ],
 *  onSucces,
 *  onError
 * );
 * @constructor
 */
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
  /**
 * Initialize the NACL factory if nacl has not been defined yet.
 * @param {Object} data - Not used
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.init = function (data, dataCallback, errorCallback) {
    Decimal.set({precision: 64}); // cryptocurrencies (like for example Ethereum) require extremely high precision!
    if (typeof nacl === 'undefined') {
      nacl_factory.instantiate(function (naclinstance) {
        nacl = naclinstance; // nacl is a global that is initialized here.
        if (typeof dataCallback === 'function') { dataCallback(); }
      });
    } else {
      if (typeof dataCallback === 'function') { dataCallback(); }
    }
  };

  /**
 * Log out of current session.
 * @param {Object} data - Not used
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.logout = function (data, dataCallback, errorCallback) {
    assets = {};
    user_keys = undefined;
    if (typeof dataCallback === 'function') { dataCallback(); }
  };

  /**
 * Create a new session and - if required - log out of current session.
 * @param {Object} data
 * @param {string} data.username - TODO
 * @param {string} data.password - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.login = function (data, dataCallback, errorCallback) {
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
    console.log('0', this, this.logout);
    this.logout({}, () => { // first logout clear current data
      console.log('aap');
      user_keys = generateKeys(data.password, data.username, 0);
      console.log('noot');
      if (typeof dataCallback === 'function') { dataCallback(); }
    });
  };

  /**
 * TODO
 * @param {Object} data
 * @param {Object} data.assetDetails - TODO
 * @param {string} data.deterministicCodeBlob - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.initAsset = function (data, dataCallback, errorCallback) {
    deterministic[data.assetDetails['keygen-base']] = activate(LZString.decompressFromEncodedURIComponent(data.deterministicCodeBlob));
    assets[data.assetDetails.symbol] = data.assetDetails;
    assets[data.assetDetails.symbol].data = {};
    assets[data.assetDetails.symbol].data.seed = seedGenerator(user_keys, data.assetDetails['keygen-base']);
    assets[data.assetDetails.symbol].data.keys = deterministic[data.assetDetails['keygen-base']].keys(assets[data.assetDetails.symbol].data);
    assets[data.assetDetails.symbol].data.keys.mode = data.assetDetails.mode.split('.')[1]; // (here submode is named mode confusingly enough)
    assets[data.assetDetails.symbol].data.address = deterministic[data.assetDetails['keygen-base']].address(assets[data.assetDetails.symbol].data.keys);
    if (dataCallback) { dataCallback(data.assetDetails.symbol); }
  };

  /**
 * TODO
 * @param {Object} data
 * @param {string} data.symbol - TODO multiple in array?
 * @param {string} [data.channel] - TODO
 * @param {Object} [data.options] - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.addAsset = function (data, dataCallback, errorCallback) {
    // TODO symbol as array of strings to load multiple?
    this.call({host: data.host, query: 'a/' + data.symbol + '/details', options: data.options, channel: data.channel}, (asset) => {
      var mode = asset.data.mode.split('.')[0];
      // TODO alleen blob ophalen als die nog niet opgehaald is
      this.call({host: data.host, query: 's/deterministic/code/' + mode, options: data.options, channel: data.channel}, (blob) => {
        this.initAsset({assetDetails: asset.data, deterministicCodeBlob: blob.data}, dataCallback, errorCallback);
      }, errorCallback);
    }, errorCallback);
  };

  /**
 * TODO
 * @param {Object} data
 * @param {string} data.symbol - TODO  multiple in array?
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.getAddress = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.address);
    } else if (typeof errorCallback === 'function') {
      errorCallback('Asset not initialized');
    }
  };

  /**
 * TODO
 * @param {Object} data
 * @param {string} data.symbol - TODO
 * @param {string} data.target - TODO
 * @param {Number} data.amount - TODO
 * @param {Number} data.fee - TODO
 * @param {Object} data.unspent - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.signTransaction = function (data, dataCallback, errorCallback) {
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
    if (typeof checkTransaction === 'undefined' && typeof dataCallback === 'function') {
      dataCallback(checkTransaction);
    }
  };

  /**
 * TODO
 * @param {Object} data
 * @param {string} data.symbol - TODO
 * @param {string} data.target - TODO
 * @param {Number} data.amount - TODO
 * @param {Number} data.fee - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.transaction = function (data, dataCallback, errorCallback) {
    /* data =
       {
       symbol
       target
       amount
       fee
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

  /**
 * TODO
 * @param {Object} data
 * @param {string} data.host - TODO  multiple in array?
 * @param {Object} [data.options] - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.addHost = function (data, dataCallback, errorCallback) {
    if (typeof data === 'string') { data = {host: data}; }
    // TODO check if valid hostname
    var hybriddNode = new HybriddNode(data.host);
    hybriddNodes[data.host] = hybriddNode;
    hybriddNode.init({userKeys: user_keys, options: data.options}, dataCallback, errorCallback);
  };

  /**
 * TODO   [API Reference]{@link https://wallet1.internetofcoins.org/api/help}
 * @param {Object} data
 * @param {string} data.query - TODO
 * @param {string} data.channel - TODO
 * @param {string} [data.host] - TODO
 * @param {Object} [data.options] - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.call = function (data, dataCallback, errorCallback) {
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

  /**
   * TODO
   * @param {Array.<string|Object|Function>} - Sequential steps to be processed. An object indicates data that is supplied to the next step. A function is a transformation of the data of the previous step and given to the next step. A string is a IoC object method that used the data from the last step and supplies to the next step.
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   */
  this.sequential = (data, successCallback, errorCallback) => {
    if (data.constructor.name === 'Array') {
      data = {steps: data};
    }

    if (data.steps.length === 0) {
      successCallback(data);
    } else {
      var step = data.steps[0];
      if (typeof step === 'string') {
        if (this.hasOwnProperty(step)) {
          console.log('this.' + step + '(' + JSON.stringify(data.data) + ')');
          this[step](data.data, resultData => {
            this.sequential({data: resultData, steps: data.steps.slice(1)}, successCallback, errorCallback);
          }, errorCallback);
        } else if (typeof errorCallback === 'function') {
          errorCallback('Method "' + step + '" does not exist for IoC class.');
        }
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
