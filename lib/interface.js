// THIS IS PREPENDED BY COMPILER: var nacl_factory = require('../common/crypto/nacl.js');

DEBUG = false;
LZString = require('../common/crypto/lz-string'); // TODO required globally by UrlBase64
let HybrixdNode = require('./hybrixdNode');
UrlBase64 = require('../common/crypto/urlbase64'); // TODO make non global as soon as index.js can do require
let Decimal = require('../common/crypto/decimal-light');
let sha256 = require('../common/crypto/sha256');
let sjcl = require('../common/crypto/sjcl');
let hexToBase32 = require('../common/crypto/hex2base32').hexToBase32;
let proof = require('../common/crypto/proof');

let DJB2 = require('../common/crypto/hashDJB2');

let CommonUtils = require('../common/index');

let baseCode = require('../common/basecode');

// emulate window for browser code executed in nodejs environment
if (typeof window === 'undefined') {
  window = {};
}
if (typeof window.crypto === 'undefined') {
  window.crypto = require('crypto');
}

// In browser implementations a window.crypto.getRandomValues is expected
// this is not in nodjes crypto library so we define it here in case
// we want to use browser code in a nodejes environment
if (typeof window.crypto.getRandomValues === 'undefined') {
  window.crypto.getRandomValues = function getRandomValues (arr) {
    const bytes = window.crypto.randomBytes(arr.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes[i];
    }
  };
}
// Likewise in a nodejs implementation crypto.randomBytes is expected
// this is not available in a browser envrioment so we define it here in case
// we want to use nodejs code in a browser environment
if (typeof window.crypto.randomBytes === 'undefined') {
  window.crypto.randomBytes = function (size, callback) {
    let bytes = [];
    for (let i = 0; i < bytes.length; i++) {
      bytes.push(0);
    }
    window.crypto.getRandomValues(bytes); // overwrite the zero values with random values
    if (typeof callback === 'function') {
      callback(null, bytes);
    } else {
      return bytes;
    }
  };
}

if (typeof crypto === 'undefined') { // Needed to make ethereum work
  crypto = window.crypto;
}
if (typeof crypto.getRandomValues === 'undefined') {
  crypto.getRandomValues = window.crypto.getRandomValues;
}

// emulate self for browser code executed in nodejs environment
if (typeof self === 'undefined') {
  self = {};
}
if (typeof self.crypto === 'undefined') {
  self.crypto = window.crypto;
}

if (typeof FormData === 'undefined') {
  FormData = {};
}

let Interface = function (data) {
  let connector = data;
  let user_keys;
  /*
    boxPk
    boxSk
  */
  let assets = {};
  /* per symbol:
     {$SYMBOL:
     {
     seed
     keys
     address
     }
     }
  */
  let clientModules = {};
  /*  per id/mode:
      {$ID/MODE :
      {
      keys()
      sign()
      ..TODO
      }
      }
  */
  let clientModuleBlobs = {};
  //  per id/mode: a string containing the code

  let hybrixdNodes = {};

  let fail = function (message, errorCallback) {
    if (DEBUG) {
      console.error(message);
    }
    if (typeof errorCallback === 'function') {
      errorCallback(message);
    }
  };

  /**
   * Initialize the NACL factory if nacl has not been defined yet.
   * @category Init
   * @param {Object} data - Not used
   * @example
   * hybrix.sequential([
   * 'init'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   **/
  this.init = function (data, dataCallback, errorCallback) {
    this.logout(null,
      () => {
        if (typeof nacl === 'undefined') {
          nacl_factory.instantiate(function (naclinstance) {
            nacl = naclinstance; // nacl is a global that is initialized here.
            window.nacl = nacl;
            if (typeof dataCallback === 'function') { dataCallback('Initialized'); }
          });
        } else {
          if (typeof dataCallback === 'function') { dataCallback('Initialized'); }
        }
      },
      errorCallback);
  };

  /**
   * Log out of current session.
   * @category Session
   * @param {Object} data - Not used
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * 'logout'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   **/
  this.logout = function (data, dataCallback, errorCallback) {
    assets = {};
    user_keys = undefined;
    if (typeof dataCallback === 'function') { dataCallback(); }
  };

  /**
   * Create a local deterministic session and - if required - log out of current session.
   * @category Session
   * @param {Object} data
   * @param {string} data.username - The username for the deterministic session
   * @param {string} data.password - The password for the deterministic session
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   **/
  this.session = function (data, dataCallback, errorCallback) {
    if (data.username !== 'DUMMYDUMMYDUMMY0' || data.password !== 'DUMMYDUMMYDUMMY0') {
      if (!CommonUtils.validateUserIDLength(data.username) || !CommonUtils.validateUseridForLegacyWallets(data.username)) {
        fail('Invalid username: ' + JSON.stringify(data.username), errorCallback);
        return;
      }
      if (!CommonUtils.validatePasswordLength(data.password)) {
        fail('Invalid password: [not shown for privacy reasons]', errorCallback);
        return;
      }
      if (!CommonUtils.validateUserIDLength(data.username) || !CommonUtils.validatePassForLegacyWallets(data.username, data.password)) {
        fail('Incorrect username password combination for: ' + data.username, errorCallback);
        return;
      }
    }

    this.logout({}, () => { // first logout clear current data
      user_keys = CommonUtils.generateKeys(data.password, data.username, 0);
      if (typeof dataCallback === 'function') {
        dataCallback(data.username);
      }
    });
  };
  /**
   * Get detailed information about assets
   * @category AssetManagement
   * @param {Object} data - An array of symbols. For example: ['eth','btc','nxt']
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * {symbol: 'dummy'}, 'asset'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   **/
  this.asset = function (data, dataCallback, errorCallback) {
    let result = {};
    for (let symbol in assets) {
      let asset = assets[symbol];
      result[symbol] = {};
      for (let key in asset) {
        if (key !== 'seed' && key !== 'keys' && key !== 'data' && key !== 'publickey' && key !== 'privatekey') {
          result[symbol][key] = asset[key];
        }
      }
      result[symbol]['address'] = asset['data']['address'];
      // result[symbol]['publickey']=asset['data']['publickey'];
      // result[symbol]['privatekey']=asset['data']['privatekey'];
    }
    dataCallback(result);
  };

  /**
   * Initialize an asset (crypto currency or token)
   * @category AssetManagement
   * @param {Object} data
   * @param {Object} data.assetDetails - Asset details as retrieved by calling `/a/$SYMBOL/details`
   * @param {string} data.clientModuleCodeBlob - A string containing the client module code blob.
   **/
  this.initAsset = function (data, dataCallback, errorCallback) {
    if (typeof data !== 'object' || data === null || !data.hasOwnProperty('assetDetails')) {
      fail('Missing \'assetDetails\'.', errorCallback);
      return;
    }

    if (!user_keys) {
      fail('Cannot initiate asset without a session.', errorCallback);
      return;
    }
    let init = () => {
      let symbol = data.assetDetails.symbol;
      assets[symbol] = data.assetDetails;
      assets[symbol].data = {};
      let mode = data.assetDetails['mode'].split('.');
      let baseMode = mode[0];
      let subMode = mode[1];
      if (!data.assetDetails.hasOwnProperty('keygen-base')) {
        fail('Missing \'keygen-base\' in details.', errorCallback);
        return;
      }
      let baseSymbol = data.assetDetails['keygen-base'];

      let addressCallback = address => {
        assets[symbol].data.address = address;
        if (dataCallback) { dataCallback(data.assetDetails.symbol); }
      };

      let keysCallback = keys => {
        assets[symbol].data.keys = keys;
        assets[symbol].data.keys.mode = subMode;
        assets[symbol].data.publickey = clientModules[baseMode].publickey(assets[symbol].data.keys);
        assets[symbol].data.privatekey = clientModules[baseMode].privatekey(assets[symbol].data.keys);

        let address = clientModules[baseMode].address(assets[symbol].data.keys, addressCallback, errorCallback);
        if (typeof address !== 'undefined') {
          addressCallback(address);
        }
      };

      assets[symbol].feesymbol = data.assetDetails['fee-symbol'] || symbol;
      assets[symbol].feefactor = data.assetDetails['fee-factor'];
      assets[symbol].data.seed = CommonUtils.seedGenerator(user_keys, baseSymbol);
      try {
        assets[symbol].data.mode = subMode;
        let keys = clientModules[baseMode].keys(assets[symbol].data, keysCallback, errorCallback);
        if (typeof keys !== 'undefined') {
          keysCallback(keys);
        }
      } catch (e) {
        fail(e, errorCallback);
      }
    };

    if (!clientModules.hasOwnProperty(data.assetDetails['mode'].split('.')[0])) { //  blob was not yet initialized
      let mode = data.assetDetails['mode'].split('.')[0];
      this.import({id: mode, blob: data.clientModuleCodeBlob}, init, errorCallback);
    } else {
      init();
    }
  };

  /**
   * Import a client module code blob.
   * @category ClientModule
   * @param {Object} data
   * @param {string} data.id - id of the client code blob.
   * @param {string} data.blob - the client code blob
   * @param {boolean} [data.check=true] - check if there's a different version of the blob available at the host
   * @param {boolean} [data.channel] - The channel used for the calls. 'y' for encryped, 'z' for encryped and compresses;
   * @param {boolean} [data.host] -  The hostname for the hybrixd node
   */
  this.import = function (data, dataCallback, errorCallback) {
    let addBlob = blob => {
      try {
        let code = LZString.decompressFromEncodedURIComponent(blob);
        let determisticCode = CommonUtils.activate(code);
        if (determisticCode) {
          clientModules[data.id] = determisticCode;
          clientModuleBlobs[data.id] = data.blob;
        } else {
          fail('Failed to activate deterministic code', errorCallback);
          return;
        }
      } catch (e) {
        fail(e, errorCallback);
        return;
      }
      dataCallback(data.id);
    };

    let checkHash = hash => {
      let blobHash;
      if (hash.hash === blobHash) { // the blob matches the hash so added
        addBlob(data.blob);
      } else { // the blob does not match the hash, so retrieve it and add that one
        this.rout({query: '/s/deterministic/code/' + data.id, host: data.host, channel: data.channel}, addBlob, errorCallback);
      }
    };

    if (hybrixdNodes.lenght > 0 && data.check === true) {
      this.rout({query: '/s/deterministic/hash/' + data.id, host: data.host, channel: data.channel}, checkHash, errorCallback);
    } else {
      addBlob(data.blob);
    }
  };

  /**
   * Export a client module code blob.
   * @category ClientModule
   * @param {Object} data - if empty, exports all blobs
   * @param {string} data.id - id of the client code blob.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * {id: 'dummycoin'},'export'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.export = function (data, dataCallback, errorCallback) {
    if (!data || !data.hasOwnProperty('id')) {
      dataCallback(clientModuleBlobs);
    } else {
      if (!clientModuleBlobs.hasOwnProperty(data.id)) {
        fail('No client module ' + data.id + ' not found.', errorCallback);
      } else {
        dataCallback(clientModuleBlobs[data.id]);
      }
    }
  };
  /**
   * List locally available client modules.
   * @category ClientModule
   * @param {Object} data - ignored
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * 'modules'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.modules = function (data, dataCallback, errorCallback) {
    dataCallback(Object.keys(clientModules));
  };
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

  this.addAsset = function (data, dataCallback, errorCallback) {
    // TODO symbol as array of strings to load multiple?
    if (!assets.hasOwnProperty(data.symbol)) { // if assets has not been iniated, retrieve and initialize
      this.rout({host: data.host, query: '/a/' + data.symbol + '/details', channel: data.channel}, (asset) => {
        if (typeof asset.mode !== 'string') {
          fail('Expected \'mode\' property of string type in asset details.', errorCallback);
          return;
        }

        let mode = asset.mode.split('.')[0];
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
  /**
   * Remove an asset (crypto currency or token) from the session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} [data.host] - The host used for the calls.
   * @param {string} [data.channel] - The channel used for the calls. 'y' for encryped, 'z' for encryped and compresses;
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'addAsset',
   * {symbol: 'dummy'}, 'removeAsset'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.removeAsset = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol)) { // if assets has not been iniated, retrieve and initialize
      delete assets[data.symbol];
      // TODO check if the determistic client code blob is still used, if not remove it.
      dataCallback(data.symbol);
    } else if (typeof dataCallback === 'function') {
      dataCallback(data.symbol);
    }
  };

  /**
   * Execute a function in a client module.
   * @category ClientModule
   * @param {Object} data
   * @param {string} [data.symbol] - The asset symbol . Either this or the id needs to be defined.
   * @param {string} [data.id] - id of the client module. (For assets this is the first part of the mode)
   * @param {string} data.func - The client module function to be called
   * @param {string} data.data - The data to be passed to the client module function
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy', func:'address', data:{}}, 'client'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.client = function (data, dataCallback, errorCallback) {
    let id;
    let displayId;

    let execute = () => {
      if (clientModules[id].hasOwnProperty(data.func) && typeof clientModules[id][data.func] === 'function') {
        let result;
        try {
          result = clientModules[id][data.func](data.data, dataCallback, errorCallback);
        } catch (e) {
          fail(e, errorCallback);
          return;
        }
        if (typeof result !== 'undefined') { // when nothing is returned, expect it to be async
          dataCallback(result);
        }
      } else {
        fail('Client module function ' + data.func + ' for ' + displayId + ' not defined or not a function.', errorCallback);
      }
    };

    let load = () => {
      if (clientModules.hasOwnProperty(id)) {
        execute();
      } else { // if blob not yet available, get it.
        this.rout({host: data.host, query: '/s/deterministic/code/' + id, channel: data.channel}, (blob) => {
          try {
            let code = LZString.decompressFromEncodedURIComponent(blob);
            clientModules[id] = CommonUtils.activate(code);
            clientModuleBlobs[id] = blob;
          } catch (e) {
            fail(e, errorCallback);
            return;
          }
          execute();
        }, errorCallback);
      }
    };

    if (data.hasOwnProperty('id')) {
      id = data.id;
      displayId = id;
      execute();
    } else if (data.hasOwnProperty('symbol')) {
      if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
        id = assets[data.symbol]['mode'].split('.')[0];
        displayId = id + '(' + data.symbol + ')';
        execute();
      } else {
        this.addAsset({symbol: data.symbol, channel: data.channel, host: data.host}, () => {
          id = assets[data.symbol]['mode'].split('.')[0];
          displayId = id + '(' + data.symbol + ')';
          execute();
        }, errorCallback);
      }
    } else {
      fail('Either data.id or data.symbol needs to be defined.', errorCallback);
    }
  };
  /**
   * Get the keys associated to a specific asset for current session. Important: handle your private keys confidentially.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The asset symbol.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'getKeys'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.getKeys = function (data, dataCallback, errorCallback) {
    this.addAsset(data, () => {
      const keys = JSON.parse(JSON.stringify(assets[data.symbol].data.keys));
      delete keys.mode;
      dataCallback(keys);
    }, errorCallback);
  };
  /**
   * Get the address associated to a specific asset for current session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The asset symbol.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'getAddress'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.getAddress = function (data, dataCallback, errorCallback) {
    this.addAsset(data, () => {
      dataCallback(assets[data.symbol].data.address);
    }, errorCallback);
  };
  /**
   * Get the public key associated to a specific asset for current session.
   * @category AssetManagement
   * @param {Object} data
   * @param {string} data.symbol - The asset symbol.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy'}, 'getPublicKey'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.getPublicKey = function (data, dataCallback, errorCallback) {
    this.addAsset(data, () => {
      dataCallback(assets[data.symbol].data.publickey);
    }, errorCallback);
  };
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
  this.setPrivateKey = function (data, dataCallback, errorCallback) {
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
  this.getPrivateKey = function (data, dataCallback, errorCallback) {
    this.addAsset(data, () => {
      dataCallback(assets[data.symbol].data.privatekey);
    }, errorCallback);
  };
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
  this.signTransaction = function (data, dataCallback, errorCallback) {
    // Error checking:
    // TODO check symbol
    // TODO check amount
    // TODO check target
    if (!assets.hasOwnProperty(data.symbol)) {
      fail('Asset ' + data.symbol + ' not added.', errorCallback);
      return;
    }
    let asset = assets[data.symbol];
    if (!clientModules.hasOwnProperty(asset['mode'].split('.')[0])) {
      fail('Asset ' + data.symbol + ' not initialized.', errorCallback);
      return;
    }

    let toIntLocal = function (input, factor) {
      let f = Number(factor);
      let x = new Decimal(String(input));
      return x.times('1' + (f > 1 ? '0'.repeat(f) : '')).toString();
    };

    // helper function to make unspents contain atomic units
    let unspentAtomic = function (input, factor) {
      let unspentsTable = [];
      let changeAtoms;
      if (Object.prototype.toString.call(input.unspents) === '[object Array]') {
        for (let i = 0; i < input.unspents.length; i++) {
          unspentsTable[i] = input.unspents[i];
          unspentsTable[i].amount = this.toIntLocal(unspentsTable[i].amount, factor);
        }
        changeAtoms = this.toIntLocal(input.change, factor);
      } else {
        changeAtoms = this.toIntLocal(0, factor);
      }
      return {'unspents': unspentsTable, 'change': changeAtoms};
    }.bind({toIntLocal: toIntLocal});

    let fee;
    try {
      fee = toIntLocal((typeof data.fee === 'undefined' ? asset.fee : data.fee), asset.feefactor);
    } catch (e) {
      fail(e, errorCallback);// todo error message
      return;
    }
    let amount;
    try {
      amount = toIntLocal(data.amount, asset.factor);
    } catch (e) {
      fail(e, errorCallback);// todo error message
      return;
    }
    let unspentOutput = data.unspent;
    if (data.unspent && data.unspent.unspents && data.unspent.change) {
      unspentOutput = unspentAtomic(data.unspent, asset.feefactor);
    }
    let transactionData = {
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
      unspent: unspentOutput,
      message: data.message,
      time: data.time
    };
    let checkTransaction;
    try {
      checkTransaction = clientModules[asset['mode'].split('.')[0]].transaction(transactionData, dataCallback, errorCallback);
    } catch (e) {
      fail(e, errorCallback);// todo error message
      return;
    }
    if (typeof checkTransaction !== 'undefined' && typeof dataCallback === 'function') {
      dataCallback(checkTransaction);
    }
  };
  /**
   * Creates a raw transaction that is signed but not yet pushed to the network. Required assets and inputs are collected accordingly.
   * @category Transaction
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} data.target - The target address
   * @param {Number} data.amount - The amount that should be transferred
   * @param {Number} [data.validate=true] - Validate target address and available funds.
   * @param {Number} [data.message] - Option to add data (message, attachment, op return) to a transaction.
   * @param {Number} [data.unspent] - Manually set the unspents
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
  this.rawTransaction = function (data, dataCallback, errorCallback, progressCallback) {
    function calcUnspentAmount (data, asset) {
      if (asset.feesymbol === asset.symbol) {
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
      if (asset.feesymbol === asset.symbol) {
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
      if (asset.feesymbol === asset.symbol) {
        return true;
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
        if (asset.symbol !== asset.feesymbol) {
          steps.unshift(
            {query: '/asset/' + asset.feesymbol + '/balance/' + asset.data.address, host: data.host, channel: data.channel}, 'rout',
            baseBalance => { return {condition: testBaseBalance(baseBalance, data, assets[data.symbol]), message: 'Insufficient funds available for transaction: ' + balance + ' ' + asset.feesymbol + '.'}; }, 'assert'
          );
        }
      }
      this.sequential({steps}, dataCallback, errorCallback, progressCallback);
    };
    this.addAsset({symbol: data.symbol, channel: data.channel, host: data.host}, validateConstructAndSignRawTransaction, errorCallback);
  };

  /**
   * Test a condition and fail with a message if condition is not met
   * @category Transaction
   * @param {Object} data
   * @param {Boolean} condition - The condition to test
   * @param {String} [message] - The message to display if condition is not met
   * @example
   * hybrix.sequential([
   * 'init',
   * {condition: true===false, password: 'Failed on purpose. True is not equal to false.'}, 'assert'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.assert = function (data, dataCallback, errorCallback, progressCallback) {
    if (data.condition) {
      dataCallback(data);
    } else {
      fail(data.message, errorCallback);
    }
  };

  /**
   * Create, sign and execute a transaction e.g. push it into the network.
   * @category Transaction
   * @param {Object} data
   * @param {string} data.symbol - The symbol of the asset
   * @param {string} data.target - The target address
   * @param {Number} data.amount - The amount that should be transferred
   * @param {Number} [data.data] - Option to add data (message, attachment, op return) to a transaction
   * @param {Number} [data.fee] - The fee.
   * @param {string} [data.host] - The host that should be used.
   * @param {string} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {symbol: 'dummy', target: '_dummyaddress_', amount:1}, 'transaction',
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.transaction = function (data, dataCallback, errorCallback, progressCallback) {
    this.sequential({steps: [
      data, 'rawTransaction',
      rawtx => { let queryobj = { query: '/a/' + data.symbol + '/push/' + rawtx, channel: data.channel, host: data.host }; return queryobj; }, 'rout'
    ]}, dataCallback, errorCallback, progressCallback);
  };
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
  this.refreshAsset = function (data, dataCallback, errorCallback, progressCallback) {
    let steps = {};
    let assetList = data.hasOwnProperty('symbol') ? {[data.symbol]: 0} : assets;
    for (let symbol in assetList) {
      let asset = assets[symbol];
      steps[symbol] = {data:
                       [
                         {query: '/a/' + symbol + '/balance/' + asset.data.address}, 'rout',
                         function (symbol) {
                           return balance => { this.assets[symbol]['balance'] = balance; return balance; };
                         }.bind({assets})(symbol)
                       ],
      step: 'sequential'};
    }
    this.parallel(steps, (data) => { this.asset(undefined, dataCallback, errorCallback, progressCallback); }, errorCallback, progressCallback);
  };
  /**
   * Add a hybrixd node as host.
   * @category Host
   * @param {Object} data
   * @param {string} data.host - The hostname for the hybrixd node
   * @example
   * hybrix.sequential([
   * 'init',
   * {host: 'http://localhost:1111/'}, 'addHost'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.addHost = function (data, dataCallback, errorCallback) {
    // TODO  multiple in array?
    if (typeof data !== 'object' || data === null) {
      fail('Expected data to be an object.', errorCallback);
      return;
    }
    if (!data.host.endsWith('/')) {
      data.host += '/';
    }
    if (
      !/^([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) && // relative path "api/"
      !/^(http|https):\/\/[a-z\d]([a-z\d-]{0,61}[a-z\d])?(\.[a-z\d]([a-z\d-]{0,61}[a-z\d])?)*(:\d*)?\/([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) && // hostnames  "http://localhost:8080/api"
      !/^(http|https):\/\/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:\d*)?\/([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) // ipv4 address "http://127.0.0.1:8080/api"
      // TODO ipv6
    ) { //  check if valid hostname is valid
      fail('Host not valid hostname, IPv4, or relative path : "' + data.host + '"  expected: "[protocol://hostnameOrIPv4Address[:portnumber]][/path]/"', errorCallback);
    } else {
      let hybrixdNode = new HybrixdNode.hybrixdNode(data.host);
      hybrixdNodes[data.host] = hybrixdNode;
      dataCallback(data.host);
    }
  };
  /**
   * Create an encrypted session with a host.
   * @category Session
   * @param {Object} data
   * @param {string} data.host - The hostname for the hybrixd node.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {host: 'http://localhost:1111/'}, 'login'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.login = function (data, dataCallback, errorCallback) {
    if (!user_keys) {
      fail('No session available.', errorCallback);
    } else if (!data.hasOwnProperty('host')) {
      fail('No host provided.', errorCallback);
    } else if (hybrixdNodes.hasOwnProperty(data.host)) {
      if (!hybrixdNodes[data.host].initialized()) {
        hybrixdNodes[data.host].init({userKeys: user_keys, connector: connector}, dataCallback, errorCallback);
      } else {
        dataCallback(data.host);
      }
    } else { // host still  needs to be added
      this.addHost({host: data.host}, () => {
        hybrixdNodes[data.host].init({userKeys: user_keys, connector: connector}, dataCallback, errorCallback);
      }, errorCallback);
    }
  };

  /**
   * Make a routing call to hybrixd node
   * @category Host
   * @param {Object} data
   * @param {string} data.query - The query path. For reference: <a href="/api/help">REST API help</a>.
   * @param {string} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @param {Boolean} [data.meta=false] - Indicate whether to include meta data (process information).
   * @param {string} [data.host] - Select a specific host, if omitted one will be chosen at random.
   * @param {Boolean} [data.retries=3] - Nr of retries for a call
   * @example
   * hybrix.sequential([
   * 'init',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {query: '/asset/dummy/details'}, 'rout'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.rout = function (data, dataCallback, errorCallback, progressCall) {
    let encrypted = data.channel === 'y' || data.channel === 'z';
    if (encrypted && typeof user_keys === 'undefined') {
      fail('No session available.', errorCallback);
      return;
    }

    let host;
    if (typeof data.host === 'undefined') {
      if (Object.keys(hybrixdNodes).length === 0) {
        fail('No hosts added.', errorCallback);
        return;
      }
      let hosts = Object.keys(hybrixdNodes);
      host = hosts[Math.floor(Math.random() * hosts.length)]; // TODO loadbalancing, round robin or something
    } else {
      host = data.host;
    }

    let makeCall = () => {
      switch (data.channel) {
        case 'y' : hybrixdNodes[host].yCall({query: data.query, channel: data.channel, userKeys: user_keys, connector: connector, retries: data.retries}, dataCallback, errorCallback); break;
        case 'z' : hybrixdNodes[host].zCall({query: data.query, channel: data.channel, userKeys: user_keys, connector: connector, retries: data.retries}, dataCallback, errorCallback); break;
        default : hybrixdNodes[host].call({query: data.query, connector: connector, retries: data.retries}, dataCallback, errorCallback); break;
      }
    };

    let doLogin = () => {
      if (!encrypted || hybrixdNodes[host].initialized()) { // if the host is already initialized, make the call
        makeCall();
      } else { // first login then make the call
        this.login({host}, makeCall, errorCallback, progressCall);
      }
    };
    if (hybrixdNodes.hasOwnProperty(host)) {
      doLogin();
    } else {
      // first add host then login
      this.addHost({host: data.host}, doLogin, errorCallback, progressCall);
    }
  };

  let legacy = function (key) {
    return nacl.to_hex(sha256(user_keys.boxPk)) + '-' + String(key);
  };

  let powQueue = [];

  /**
   * Stringify and encrypt data with user keys.
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - The key identifier for the data.
   * @param {Object} data.value - A string, array or object.
   * @param {Boolean} [data.legacy=false] - A toggle to use a legacy storage method.
   * @param {Boolean} [data.encrypted=true] - whether to encrypt the data with the user key.
   * @param {String} [data.work=true] - whether to perform proof of work.
   * @param {String} [data.queue=false] - whether to queue proof of work. Execute later with queue method
   * @param {String} [data.submit=true] - whether to submit proof of work.
   * @param {String} [data.host] - The host to store the data on.
   * @param {String} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @param {Boolean} [data.meta=false] - Indicate whether to include meta data (process information).
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save',
   * {key:'Hello'}, 'load'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.save = function (data, dataCallback, errorCallback, progressCallback) {
    let redirectCallback;
    if (data.work !== false) { // redirect to do and submit proof of work
      redirectCallback = key => result => {
        if (result.hasOwnProperty('challenge')) {
          if (data.queue) { // save work for later
            powQueue.push({
              action: result.action,
              hash: result.hash,
              challenge: result.challenge,
              difficulty: result.difficulty,
              submit: data.submit,
              host: data.host,
              channel: data.channel,
              key
            });
            dataCallback({result});
          } else { // do work now
            this.work({
              challenge: result.challenge,
              difficulty: result.difficulty,
              host: data.host,
              channel: data.channel,
              key,
              submit: typeof data.submit === 'undefined' ? true : data.submit
            },
            work => {
              if (data.submit === false) {
                delete result.difficulty;
                delete result.challenge;
                result.solution = work.solution;
              } else {
                delete result.difficulty;
                delete result.challenge;
                result.expire = work.expire;
              }
              dataCallback(result);
            },
            errorCallback, progressCallback);
          }
        } else {
          dataCallback(result);
        }
      };
    } else {
      redirectCallback = dataCallback;
    }

    if (typeof data !== 'object') {
      fail('Expected an object.', errorCallback);
    } else if (!data.hasOwnProperty('key') || typeof data.key !== 'string') {
      fail('Expected \'key\' property of string type.', errorCallback);
    } else if (!data.hasOwnProperty('value')) {
      fail('Expected \'value\' property.', errorCallback);
    } else if (data.encrypted === false) {
      // stringify, escape quotes, and encode
      const key = data.key;
      this.rout({host: data.host, query: '/e/storage/save/' + encodeURIComponent(key) + '/' + encodeURIComponent(JSON.stringify(data.value).replace(/"/g, '\\"')), channel: data.channel}, redirectCallback(key), errorCallback, progressCallback);
    } else if (data.legacy === true) {
      const key = legacy(data.key);
      this.sequential([
        {data: data.value}, 'encrypt',
        result => { return {host: data.host, query: '/e/storage/save/' + encodeURIComponent(key) + '/' + result, channel: data.channel, meta: data.meta}; }, 'rout'
      ], redirectCallback(key), errorCallback, progressCallback);
    } else {
      const key = data.key;
      this.sequential([
        {data: data.value}, 'encrypt',
        result => { return {host: data.host, query: '/e/storage/save/' + encodeURIComponent(key) + '/' + result, channel: data.channel, meta: data.meta}; }, 'rout'
      ], redirectCallback(key), errorCallback, progressCallback);
    }
  };

  /**
   * Perform Proof of Work required to extend saved data retention.
   * @category Storage
   * @param {Object} data
   * @param {Object} data.challenge - The hint that needs to be worked.
   * @param {Object} data.difficulty - The difficulty of the work
   * @param {string} [data.submit] - Whether to submit the proof of work
   * @param {Object} [data.key] - Required for submit
   * @param {String} [data.host] - The host to store the data on.
   * @param {String} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @param {Boolean} [data.meta=false] - Indicate whether to include meta data (process information).
   */
  this.work = function (data, dataCallback, errorCallback, progressCallback) {
    let redirectCallback;
    if (data.submit && data.key) { // redirect to submit proof of work
      redirectCallback = hash => {
        this.rout({query: '/e/storage/work/' + encodeURIComponent(data.key) + '/' + hash, host: data.host, channel: data.channel, meta: data.meta}, dataCallback, errorCallback, progressCallback);
      };
    } else {
      redirectCallback = solution => dataCallback({solution});
    }
    proof.solve(data.challenge, data.difficulty, redirectCallback, errorCallback, progressCallback);
  };

  /*
   * Performed queued Proof of Work required to extend saved data retention.
   * @category Storage
   * @param {Object} data
   * @param {string} [data.submit=true] - Whether to submit the proof of work
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!',queue:true}, 'save',
   * 'queue'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.queue = function (data, dataCallback, errorCallback, progressCallback) {
    const steps = {};
    const submit = typeof data === 'object' && data !== null && data.submit !== false;
    for (let i = 0; i < powQueue.length; ++i) {
      const pow = powQueue[i];
      const sequence = [
        {submit, ...pow}, 'work',
        result => {
          result.key = pow.key;
          result.action = pow.action;
          result.hash = pow.hash;
          if (!submit) {
            result.challenge = pow.challenge;
            result.difficulty = pow.difficulty;
          }

          return result;
        }

      ];
      steps[i] = {data: sequence, step: 'sequential'};
    }
    powQueue = [];
    this.parallel(steps, dataCallback, errorCallback, progressCallback);
  };

  /**
   * Retrieve value associated with key from the hybrixd node storage
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - The key identifier for the data.
   * @param {Boolean} [data.encrypted=true] - whether to encrypt the data with the user key, true by default.
   * @param {Boolean} [data.legacy=false] - A toggle to use a legacy storage method.
   * @param {String} [data.host] - The host to store the data on.
   * @param {String} [data.channel=''] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save',
   * {key:'Hello'}, 'load'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.load = function (data, dataCallback, errorCallback, progressCallback) {
    if (typeof data !== 'object') {
      fail('Expected an object.', errorCallback);
    } else if (!data.hasOwnProperty('key') || typeof data.key !== 'string') {
      fail('Expected \'key\' property of string type.', errorCallback);
    } else if (data.encrypted === false) {
      this.rout({host: data.host, query: '/e/storage/get/' + encodeURIComponent(data.key), channel: data.channel, meta: data.meta}, (data) => {
        dataCallback(decodeURIComponent(data));
      }, errorCallback, progressCallback);
    } else if (data.legacy === true) {
      this.sequential([
        {host: data.host, query: '/e/storage/get/' + encodeURIComponent(legacy(data.key)), channel: data.channel}, 'rout',
        result => { return {data: result}; }, 'decrypt'
      ], dataCallback, errorCallback, progressCallback);
    } else {
      this.sequential([
        {host: data.host, query: '/e/storage/get/' + encodeURIComponent(data.key), channel: data.channel}, 'rout',
        result => { return {data: result}; }, 'decrypt'
      ], dataCallback, errorCallback, progressCallback);
    }
  };

  /**
   * Check if a value is associated with key in the hybrixd node storage
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - The key identifier for the data.
   * @param {Boolean} [data.legacy=false] - A toggle to use a legacy storage method.
   * @param {String} [data.host] - The host to store the data on.
   * @param {String} [data.channel=''] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save',
   * {key:'Hello'}, 'seek'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.seek = function (data, dataCallback, errorCallback, progressCallback) {
    if (typeof data !== 'object') {
      fail('Expected an object.', errorCallback);
    } else if (!data.hasOwnProperty('key') || typeof data.key !== 'string') {
      fail('Expected \'key\' property of string type.', errorCallback);
    } else if (data.legacy === true) {
      this.rout({host: data.host, query: '/e/storage/seek/' + encodeURIComponent(legacy(data.key)), channel: data.channel, meta: data.meta}, (data) => {
        dataCallback(decodeURIComponent(data));
      }, errorCallback, progressCallback);
    } else {
      this.rout({host: data.host, query: '/e/storage/seek/' + encodeURIComponent(data.key), channel: data.channel, meta: data.meta}, (data) => {
        dataCallback(decodeURIComponent(data));
      }, errorCallback, progressCallback);
    }
  };

  /**
   * Retrieve the meta data for a storage key in the hybrixd node storage
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - The key identifier for the data.
   * @param {String} [data.host] - The host to store the data on.
   * @param {String} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression.
   * @param {Boolean} [data.meta=false] - Indicate whether to include meta data (process information).
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save',
   * {key:'Hello'}, 'meta'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.meta = function (data, dataCallback, errorCallback, progressCallback) {
    if (typeof data !== 'object') {
      fail('Expected an object.', errorCallback);
    } else if (!data.hasOwnProperty('key') || typeof data.key !== 'string') {
      fail('Expected \'key\' property of string type.', errorCallback);
    } else {
      this.rout({host: data.host, query: '/e/storage/meta/' + encodeURIComponent(data.key), channel: data.channel, meta: data.meta}, dataCallback, errorCallback, progressCallback);
    }
  };
  /**
   * Stringify and create a DJB2 hash.
   * @category Encryption
   * @param {Object} data
   * @param {Object} data.data - A string, array or object.
   * @param {String} [data.salt] - A string.
   * @example
   * hybrix.sequential([
   * 'init',
   * {data:'hello world'}, 'hash'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */

  this.hash = function (data, dataCallback, errorCallback) {
    // TODO only add salt if salt
    // TODO add sha option
    dataCallback(DJB2.hash(JSON.stringify(data.data) + JSON.stringify(data.salt)));
  };

  /**
   * Create signing keys
   * @category Encryption
   * @param {Object} data
   * @param {String} [data.secret] - The secret key to recreate a public key from.
   * @example
   * hybrix.sequential([
   * 'init',
   * 'keys'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.keys = function (data, dataCallback, errorCallback) {
    if (!data.hasOwnProperty('secret')) {
      const keys = nacl.crypto_sign_keypair();
      const publicKey = nacl.to_hex(keys.signPk);
      const secret = nacl.to_hex(keys.signSk);
      dataCallback({public: publicKey, secret}); // create keypair
    } else if (typeof data.secret === 'string' && data.secret.length === 128) {
      const secret = nacl.from_hex(data.secret);
      const keys = nacl.sign.keyPair.fromSecretKey(secret).publicKey;
      const publicKey = nacl.to_hex(keys.signPk);
      const secretKey = nacl.to_hex(keys.signSk);
      dataCallback({public: publicKey, secret: secretKey}); //  public key from secret key
    } else {
      fail('Expected \'secret\' property of string type with length 128.', errorCallback);
    }
  };

  /**
   * Sign a message with a secret key or verify the signature for a public key.
   * @category Encryption
   * @param {Object} data
   * @param {String} data.message - The message to sign or open.
   * @param {String} [data.public] - The public key to verify.
   * @param {String} [data.secret] - The secret key to sign with.
   * @param {Boolean|String} [data.signature] - Indication to create a detached signature or a detached signature to verify.
   * @example
   * var myKeys;
   * hybrix.sequential([
   * 'init',
   * 'keys',  // Create key pair
   * keys => { myKeys = keys;}, // Store key pair
   * result => {return {message:'Hello World',secret:myKeys.secret}},'sign', // Sign message with secret
   * result => {return {message: result, public: myKeys.public}}, 'sign'  // Open message with public
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.sign = function (data, dataCallback, errorCallback) {
    if (!data.hasOwnProperty('message') || typeof data.message !== 'string') {
      fail('Expected \'message\' property of string type.', errorCallback);
    } else if (data.hasOwnProperty('secret') && typeof data.secret === 'string' && data.secret.length === 128) {
      let secret = nacl.from_hex(data.secret);
      var message = baseCode.recode('utf-8', 'hex', data.message);
      message = nacl.from_hex(message);
      if (data.signature) {
        message = nacl.crypto_sign_detached(message, secret);
      } else {
        message = nacl.crypto_sign(message, secret);
      }
      message = nacl.to_hex(message);
      dataCallback(message);
    } else if (data.hasOwnProperty('public') && typeof data.public === 'string' && data.public.length === 64) {
      let publicKey = nacl.from_hex(data.public);
      message = nacl.from_hex(data.message);
      if (typeof data.signature === 'string') {
        let verified = nacl.crypto_sign_verify_detached(message, data.signature, publicKey);
        dataCallback(verified);
      } else {
        let unpackedMessage = nacl.crypto_sign_open(message, publicKey);
        if (unpackedMessage === null) {
          fail('Failed to open message using provided public key.', errorCallback);
        } else {
          unpackedMessage = nacl.to_hex(unpackedMessage);
          unpackedMessage = baseCode.recode('hex', 'utf-8', unpackedMessage);
          dataCallback(unpackedMessage);
        }
      }
    } else {
      fail('Expected \'secret\' property of string type with length 128 or \'public\' of length 64.', errorCallback);
    }
  };

  /**
   * Stringify and encrypt data with user keys.
   * @category Encryption
   * @param {Object} data
   * @param {Object} data.data - A string, array or object.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {data:'Hello World!'}, 'encrypt'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.encrypt = function (data, dataCallback, errorCallback) {
    if (!user_keys) {
      fail('No session available.', errorCallback);
    } else {
      let result;
      try {
        let nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
        let crypt_utf8 = nacl.encode_utf8(JSON.stringify(data.data));
        let crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, user_keys.boxPk, user_keys.boxSk);
        result = UrlBase64.safeCompress(nacl.to_hex(crypt_bin));
      } catch (e) {
        fail(e, errorCallback);// TODO improve error
        return;
      }
      dataCallback(result);
    }
  };

  /**
   * Decrypt and parse data with user keys.
   * @category Encryption
   * @param {Object} data
   * @param {String} data.data - An encrypted and stringified string, array or object.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {data:'Hello World!'}, 'encrypt',
   * data=>{return {data:data}}, 'decrypt'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.decrypt = function (data, dataCallback, errorCallback) {
    if (!user_keys) {
      fail('No session available.', errorCallback);
    } else if (typeof data.data !== 'string') {
      fail('Expected \'data\' to be a string.', errorCallback);
    } else {
      let result;
      try {
        let nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
        let crypt_hex = nacl.from_hex(UrlBase64.safeDecompress(data.data));
        // use nacl to create a crypto box containing the data
        let crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, user_keys.boxPk, user_keys.boxSk);
        result = JSON.parse(nacl.decode_utf8(crypt_bin));
      } catch (err) {
        fail(err, errorCallback); // TODO better error message
      }
      dataCallback(result);
    }
  };

  /**
   * Create a new deterministic account with the entropy provided.
   * @category Session
   * @param {Object} data
   * @param {string} [data.entropy] - CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Entropy can be provided. Must be a sufficient random string of at least 482 bytes.
   * @param {Function} [data.offset] - CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Use an offset to create multiple accounts from same entropy.
   * @param {Function} [data.pool] -  CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Pool function can be overridden by a custom 1600 byte pool generator.
   * deterministic
   */
  this.createAccount = function (data, dataCallback, errorCallback) {
    if (typeof data === 'undefined') { data = {}; }

    let create = function (entropy, offset) {
      let minimalEntropyLength = 411 + 20 + 60;
      if (data.entropy.length <= minimalEntropyLength) {
        fail('Entropy is of insufficient length. Required > ' + minimalEntropyLength, errorCallback);
        return;
      }

      let password = hexToBase32(entropy.substr(offset + 20, 60));
      let username = hexToBase32(entropy.substr(offset, 12) +
                                 DJB2.hash(entropy.substr(offset, 12).toUpperCase()).substr(0, 4) +
                                 DJB2.hash(entropy.substr(offset, 12).toLowerCase() + password.toUpperCase()).substr(4, 4));

      dataCallback({username, password});
    };

    if (typeof data.entropy === 'string') {
      create(data.entropy, data.offset || 0);
    } else {
      let pool;
      if (typeof data.pool === 'function') {
        pool = data.pool;
      } else {
        pool = function (randomNumber) {
          // randomNumber not used by pool in this instance
          return crypto.randomBytes(1600).toString('hex');
        };
      }

      data.entropy = '';
      let maxIndex = 1000 + Math.floor(Math.random() * 256);

      let numberList = new Array(maxIndex).fill(0).map(() => {
        return Math.floor(Math.random() * Math.pow(8, 16));
      });

      var iterate = index => {
        if (index === maxIndex) {
          let offset = Math.floor(Math.random() * 411);
          create(data.entropy, offset);
        } else {
          data.entropy = pool(numberList[index]);
          ++index;
          iterate(index);
        }
      };
      iterate(0);
    }
  };

  /**
   * Identity function, outputs the data that is passed
   * @category Flow
   * @param {Array.<string|Object|Function>} data - data passed to  dataCallback
   * @example
   * hybrix.sequential([
   * 'init',
   * {hello:'world'}, 'id'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.id = (data, dataCallback, errorCallback) => {
    dataCallback(data);
  };

  /**
   * Execute a custom function with callbacks. Usefull for sequential and parallel.
   * @category Flow
   * @param {Object} data
   * @param {Function} data.func - A function expecting a dataCallback, errorCallback and optional progressCallback.
   * @param {Object} data.data - The data to be passed to the function.
   * @example
   *   hybrix.sequential([
   *     'init',                                                        // Initialize hybrix
   *     {func: (data,onSuccess,onError,onProgress)=>{                  // Declare a custom function
   *       onProgress(0.5);                                             // Set the progress to 50%
   *       setTimeout(onSuccess,2000,data+1);                           // Wait to seconds, then output result + 1
   *     }, data:1} , 'call'                                            // Provide the initial data
   *   ],
   *    onSuccess,                                                      // Define action to execute on successfull completion
   *    onError,                                                        // Define action to execute when an error is encountered
   *    onProgress                                                      // Define action to execute whenever there is a progress update
   );

  */
  this.call = (data, dataCallback, errorCallback, progressCallback) => {
    data.func(data.data, dataCallback, errorCallback, progressCallback);
  };

  /**
   * Sequentually executes functions and passes results to next step.
   * @category Flow
   * @param {Array.<string|Object|Function>} data - Sequential steps to be processed. An object indicates data that is supplied to the next step. A function is a transformation of the data of the previous step and given to the next step. A string is a method that used the data from the last step and supplies to the next step.
   * @example
   * hybrix.sequential([
   * 'init',
   * {username: 'DUMMYDUMMYDUMMY0', password: 'DUMMYDUMMYDUMMY0'}, 'session',
   * {data:'Hello World!'}, 'encrypt',
   * data=>{return {data:data}}, 'decrypt'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.sequential = (data, dataCallback, errorCallback, progressCallback, currentStep, totalSteps) => {
    if (data.constructor.name === 'Array') {
      data = {steps: data};
    }
    if (typeof currentStep === 'undefined') {
      currentStep = 0;
      totalSteps = data.steps.length;
    }

    if (data.steps.length === 0) {
      if (typeof progressCallback === 'function') {
        progressCallback(1);
      }
      dataCallback(data.data);
    } else {
      if (typeof progressCallback === 'function') {
        progressCallback(currentStep / totalSteps);
      }
      let step = data.steps[0];
      if (typeof step === 'string') {
        if (this.hasOwnProperty(step)) {
          if (DEBUG) { console.log('this.' + step + '(' + JSON.stringify(data.data) + ')'); }

          let subStepProgressCallback;
          if (typeof progressCallback === 'function') {
            subStepProgressCallback = (progress) => {
              progressCallback((currentStep + progress) / totalSteps);
            };
          }

          this[step](data.data, resultData => {
            this.sequential({data: resultData, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
          }, errorCallback, subStepProgressCallback);
        } else {
          fail('Method \'' + step + '\' does not exist.', errorCallback);
        }
      } else if (typeof step === 'object') {
        if (DEBUG) { console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(step)); }
        this.sequential({data: step, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
      } else if (typeof step === 'function') {
        let result = step(data.data);
        if (DEBUG) { console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(result)); }
        this.sequential({data: result, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
      }
    }
  };

  /**
   * Parallely executes several threads and collects results in a single object.
   * @category Flow
   * @param {Object} data - Parallel steps to be processed.
   * @param {Object} data.label - A label given to the thread.
   * @param {Object} data.label.data - The initial data passed to this thread.
   * @param {Object} data.label.step - The step to execute with the data. Use 'sequential' to create multi step thread process.

   * @example
   * hybrix.sequential([
   * 'init',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {fee: {data:{query:'/asset/dummy/fee'}, step: 'rout'}, factor: {data:{query:'/asset/dummy/factor'}, step: 'rout'}} , 'parallel'
   * ]
   *   , onSuccess
   *   , onError
   *   , onProgress
   * );
   */
  this.parallel = (data, dataCallback, errorCallback, progressCallback) => {
    let steps = data;
    let stepCount = Object.keys(steps).length;

    let resultMarks = {};
    let resultProgress = {};
    for (let i in steps) {
      resultProgress[i] = 0;
    }
    let parallelProgressCallback;
    if (typeof progressCallback === 'function') {
      parallelProgressCallback = () => {
        let totalProgress = 0;
        for (let i in steps) {
          totalProgress += resultProgress[i];
        }
        progressCallback(totalProgress / stepCount);
      };
    }

    let resultData = {};

    if (stepCount === 0) {
      dataCallback({});
      return;
    }
    let dataSubCallback = i => result => {
      if (resultMarks.hasOwnProperty(i)) { return; }
      resultProgress[i] = 1;
      resultMarks[i] = true;
      resultData[i] = result;
      if (typeof progressCallback === 'function') { parallelProgressCallback(); }
      if (Object.keys(resultMarks).length === stepCount) {
        dataCallback(resultData);
      }
    };

    let errorSubCallback = i => e => {
      if (resultMarks.hasOwnProperty(i)) { return; }
      resultMarks[i] = false;
      resultProgress[i] = 1;
      resultData[i] = undefined; // error;
      if (typeof progressCallback === 'function') { parallelProgressCallback(); }
      if (Object.keys(resultMarks).length === stepCount) {
        /* if (errorCount === resultCount) {
           if (DEBUG) { console.error(e); }
           if (typeof errorCallback === 'function') {
           errorCallback(e);
           }
           } else { */
        dataCallback(resultData);
        // }
      }
    };
    let subProgressCallback;
    if (typeof progressCallback === 'function') {
      subProgressCallback = i => progress => {
        resultProgress[i] = progress;
        parallelProgressCallback();
      };
    }
    let executeStep = (i, step, data) => {
      if (typeof step === 'string') {
        if (this.hasOwnProperty(step)) {
          this[step](data, dataSubCallback(i), errorSubCallback(i), subProgressCallback);
        } else {
          fail('Method \'' + step + '\' does not exist.', errorCallback);
        }
      } else if (typeof step === 'function') {
        step(data, dataSubCallback(i), errorSubCallback(i), subProgressCallback);
      }
    };

    for (let i in steps) {
      let step = steps[i];
      if (typeof step === 'object') {
        if (step.hasOwnProperty('step')) {
          if (step.hasOwnProperty('data')) {
            executeStep(i, step.step, step.data);
          } else {
            executeStep(i, step.step, data);
          }
        } else {
          fail('No step defined.', errorCallback);
        }
      } else {
        executeStep(i, step, data);
      }
    }
  };

  this.promise = function (step, data) {
    return new Promise(function (resolve, reject) {
      if (this.interface.hasOwnProperty(step)) {
        this.interface[step](data, resolve, reject);
      } else {
        reject('Method \'' + step + '\' does not exist.');
      }
    }.bind({interface: this}));
  };
};

module.exports = {Interface};
