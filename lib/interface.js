DEBUG = false;
LZString = require('../common/crypto/lz-string'); // TODO required globally by UrlBase64
var HybriddNode = require('./hybriddNode');
UrlBase64 = require('../common/crypto/urlbase64'); // TODO make non global as soon as index.js can do require
var Decimal = require('../common/crypto/decimal-light');
var sha256 = require('../common/crypto/sha256');

var CommonUtils = require('../common/index');
var sjcl = require('../common/crypto/sjcl');
var hexToBase32 = require('../common/crypto/hex2base32').hexToBase32;
var proof = require('../common/crypto/proof');

var DJB2 = require('../common/crypto/hashDJB2');

// emulate window for browser code executed in nodejs environment
if (typeof window === 'undefined') {
  window = {};
}
if(typeof window.crypto === 'undefined'){
 window.crypto = require('crypto');
}

// In browser implementations a window.crypto.getRandomValues is expected
// this is not in nodjes crypto library so we define it here in case
// we want to use browser code in a nodejes environment
if (typeof window.crypto.getRandomValues === 'undefined') {
  window.crypto.getRandomValues = function getRandomValues (arr) {
    const bytes = window.crypto.randomBytes(arr.length);
    for (var i = 0; i < bytes.length; i++) {
      arr[i] = bytes[i];
    }
  }
}
// Likewise in a nodejs implementation crypto.randomBytes is expected
// this is not available in a browser envrioment so we define it here in case
// we want to use nodejs code in a browser environment
if (typeof window.crypto.randomBytes === 'undefined') {
  window.crypto.randomBytes = function(size,callback){
    var bytes = [];
    for (var i = 0; i < bytes.length; i++) {
      bytes.push(0);
    }
    window.crypto.getRandomValues(bytes); // overwrite the zero values with random values
    if(typeof callback === 'function'){
      callback(null,bytes);
    }else{
      return bytes;
    }
  }
}

if (typeof crypto === 'undefined') { //Needed to make ethereum work
  crypto = window.crypto;
}
if (typeof crypto.getRandomValues === 'undefined') {
  crypto.getRandomValues = window.crypto.getRandomValues ;
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

/* NOT NEEDED AS IT IS INCLUDED AT COMPILE TIME
 * fs = require('fs');
 * var naclFactory = require('../crypto/nacl');
 * TODO include sjcl?
 * nacl_factory = require('../crypto/nacl');
 */

/**
 * Internet of Coins main API interface object. It connects to servers running Internet of Coins Hybridd using the REST API.  For reference: [Hybridd API]{@link https://wallet1.internetofcoins.org/api/help}
 * @param {Object} data - one of the three methods below must be passed:
 * @param {Object} data.http - a http object. ({@link https://nodejs.org/api/http.html})
 * @param {Object} data.https - a https object. ({@link https://nodejs.org/api/https.html})
 * @param {Object} data.XMLHttpRequest - a XMLHttpRequest object. ({@link https://developer.mozilla.org/nl/docs/Web/API/XMLHttpRequest})
 * @param {Function} data.custom - a custom connector method which receives a hostname, query, dataCallback and errorCallback parameters and returns a string.
 * @example
 * // Node JS
 * var Hybridd = require('./hybridd.interface.nodejs');
 *
 * var hybridd = new Hybridd.Interface({http:require('http')});
 *
 * function onSucces(){
 *  console.error('Done.');
 * }
 *
 * function onError(){
 *   console.error('Oops, something went wrong!');
 * }
 *
 * hybridd.init(null, onSucces, onError);
 * @example
 * <!-- Webpage -->
 * <script src="./hybridd.interface.web.js"></script> to html header
 * <script>
 * var hybridd = new Hybridd.Interface({XMLHttpRequest:XMLHttpRequest});
 *
 * function onSucces(){
 *  console.error('Done.');
 * }
 *
 * function onError(){
 *   console.error('Oops, something went wrong!');
 * }
 *
 * hybridd.init(null, onSucces, onError);
 * </script>
 * @example
 * hybridd.sequential([
 *   'init', // Initialize hybridd
 *   {username: '****************', password: '****************'}, // Define credentials
 *   'session', // Create a local deterministic session
 *   {host: 'http://localhost:1111/'}, // Define the host
 *   'addHost', // Add and initialize the host
 *   {symbol: 'dummy'}, // Define the asset
 *   'addAsset', // Add and initialize the asset
 *   {symbol: 'dummy', amount: 100}, // Define the transaction
 *   'transaction' // Execute the transaction
 * ],
 *  onSucces,
 *  onError,
 *  onProgress
 * );
 * @constructor
 */

var Interface = function (data) {
  var connector = data;
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
  var clientModules = {};
  /*  per id/mode:
      {$ID/MODE :
      {
      keys()
      sign()
      ..TODO
      }
      }
  */
  var clientModuleBlobs = {};
  //  per id/mode: a string containing the code

  var hybriddNodes = {};

  var escapeString = function (str) {
    return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
  }

 /**
 * Initialize the NACL factory if nacl has not been defined yet.
 * @category Init
 * @param {Object} data - Not used
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.init = function (data, dataCallback, errorCallback) {
    this.logout(null,
      () => {
        if (typeof nacl === 'undefined') {
          nacl_factory.instantiate(function (naclinstance) {
            nacl = naclinstance; // nacl is a global that is initialized here.
            window.nacl = nacl;
            if (typeof dataCallback === 'function') { dataCallback(); }
          });
        } else {
          if (typeof dataCallback === 'function') { dataCallback(); }
        }
      },
      errorCallback);
  };

  /**
 * Log out of current session.
 * @category Session
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
 * Create a local deterministic session and - if required - log out of current session.
 * @category Session
 * @param {Object} data
 * @param {string} data.username - The username for the deterministic session
 * @param {string} data.password - The password for the deterministic session
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.session = function (data, dataCallback, errorCallback) {
    if (!CommonUtils.validateUserIDLength(data.username)) {
      if (typeof errorCallback === 'function') {
        errorCallback('Invalid username: '+JSON.stringify(data.username));
      }
      return;
    }
    if (!CommonUtils.validatePasswordLength(data.password)) {
      if (typeof errorCallback === 'function') {
        errorCallback('Invalid password: [Not shown for privacy reasons]');
      }
      return;
    }
    this.logout({}, () => { // first logout clear current data
      user_keys = CommonUtils.generateKeys(data.password, data.username, 0);
      if (typeof dataCallback === 'function') {
        dataCallback(data.username); }
    });
  };
  /**
 * Get detailed information about assets
 * @category AssetManagement
 * @param {Object} data - An array of symbols. For example: ['eth','btc','nxt']
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.asset = function(data, dataCallback, errorCallback){
    var result = {};
    for(var symbol in assets){
      var asset = assets[symbol];
      result[symbol]={};
      for(var key in asset){
        if(key!=='seed' && key!=='keys' &&  key!=='data'){
          result[symbol][key]=asset[key];
        }
      }
      result[symbol]['address']=asset['data']['address'];
      result[symbol]['publickey']=asset['data']['publickey'];
      result[symbol]['privatekey']=asset['data']['privatekey'];
    }
    dataCallback(result);
  }
  /**
 * Initialize an asset (crypto currency or token)
 * @category AssetManagement
 * @param {Object} data
 * @param {Object} data.assetDetails - Asset details as retrieved by calling `/asset/$SYMBOL/details`
 * @param {string} data.clientModuleCodeBlob - A string containing the client module code blob.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.initAsset = function (data, dataCallback, errorCallback) {
    if (!clientModules.hasOwnProperty(data.assetDetails['mode'].split('.')[0])) { //  blob was not yet initialized
   // TODO Error if no data.clientModuleCodeBlob was provided
      try {
        var code = LZString.decompressFromEncodedURIComponent(data.clientModuleCodeBlob);
        var mode = data.assetDetails['mode'].split('.')[0];
        var determisticCode = CommonUtils.activate(code);
        if(determisticCode){
          clientModules[mode] = determisticCode;
          clientModuleBlobs[mode] = data.clientModuleCodeBlob;
        }else{
          if (DEBUG) { console.error("Failed to activate deterministic code."); }
          if (typeof errorCallback === 'function') {
            errorCallback("Failed to activate deterministic code.");
          }
          return;
        }
      } catch (e) {
        if (DEBUG) { console.error(e); }
        if (typeof errorCallback === 'function') {
          errorCallback(e);// TODO prepend error message
        }
        return;
      }
    }
    var symbol = data.assetDetails.symbol;
    assets[symbol] = data.assetDetails;
    assets[symbol].data = {};
    var mode = data.assetDetails['mode'].split('.');
    var baseMode = mode[0];
    var subMode = mode[1];
    var baseSymbol = data.assetDetails['keygen-base'];
    assets[symbol].feesymbol = data.assetDetails['fee-symbol'];
    assets[symbol].feefactor = data.assetDetails['fee-factor'];
    assets[symbol].data.seed = CommonUtils.seedGenerator(user_keys, baseSymbol);
    try {
      assets[symbol].data.mode = subMode;
      assets[symbol].data.keys = clientModules[baseMode].keys(assets[symbol].data);
      assets[symbol].data.keys.mode = subMode;
      assets[symbol].data.address = clientModules[baseMode].address(assets[symbol].data.keys);
      assets[symbol].data.publickey = clientModules[baseMode].publickey(assets[symbol].data.keys);
      assets[symbol].data.privatekey = clientModules[baseMode].privatekey(assets[symbol].data.keys);
    } catch (e) {
      if (DEBUG) { console.error(e); }
      if (typeof errorCallback === 'function') {
        errorCallback(e);// TODO prepend error message
      }
      return;
    }
    if (dataCallback) { dataCallback(data.assetDetails.symbol); }
  };

  /**
   * Import a client module code blob.
 * @category ClientModule
 * @param {Object} data
   * @param {string} data.id - id of the client code blob.
   * @param {string} data.blob - The client code blob
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   */
  this.import = function (data, dataCallback, errorCallback) {
    try {
      var code = LZString.decompressFromEncodedURIComponent(data.blob);
      clientModules[data.id] = CommonUtils.activate(code);
      clientModuleBlobs[data.id] = data.blob;
    } catch (e) {
      if (DEBUG) { console.error(e); }
      if (typeof errorCallback === 'function') {
        errorCallback(e);// TODO prepend error message
      }
    }
    dataCallback(data.id);
  };

  /**
   * Export a client module code blob.
 * @category ClientModule
 * @param {Object} data
   * @param {string} data.id - id of the client code blob.
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   */
  this.export = function (data, dataCallback, errorCallback) {
    if (!data.hasOwnProperty('id')) {
      if (DEBUG) { console.error('No client module id provided.'); }
      if (typeof errorCallback === 'function') { errorCallback('No client module id provided.'); }
    } else if (!clientModuleBlobs.hasOwnProperty(data.id)) {
      if (DEBUG) { console.error('No client module ' + data.id + ' not found.'); }
      if (typeof errorCallback === 'function') { errorCallback('No client module ' + data.id + ' not found.'); }
    } else {
      data.callback(clientModuleBlobs[data.id]);
    }
  };
  /**
   * List locally available client modules.
 * @category ClientModule
   * @param {Object} data - ignored
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   */
  this.modules = function (data, dataCallback, errorCallback) {
    dataCallback(Object.keys(clientModules));
  };
  /**
 * Add an asset (crypto currency or token) to the session.
 * @category AssetManagement
 * @param {Object} data
 * @param {string} data.symbol - The symbol of the asset
 * @param {string} [data.host] - The host used for the calls.
 * @param {string} [data.channel] - The channel used for the calls. 'y' for encryped, 'z' for encryped and compresses;
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.addAsset = function (data, dataCallback, errorCallback) {
    // TODO symbol as array of strings to load multiple?
    if (!assets.hasOwnProperty(data.symbol)) { // if assets has not been iniated, retrieve and initialize
      this.rout({host: data.host, query: '/asset/' + data.symbol + '/details', channel: data.channel}, (asset) => {
        var mode = asset.mode.split('.')[0];
        if (clientModules.hasOwnProperty(mode)) { // Client Module was already retrieved
          this.initAsset({assetDetails: asset}, dataCallback, errorCallback);
        } else {
          this.rout({host: data.host, query: '/source/deterministic/code/' + mode, channel: data.channel}, (blob) => {
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
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   */
  this.removeAsset = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol)) { // if assets has not been iniated, retrieve and initialize
      delete assets[data.symbol];
      //TODO check if the determistic client code blob is still used, if not remove it.
      dataCallback(data.symbol);
    } else if (typeof dataCallback === 'function') {
      dataCallback(data.symbol);
    }
  }

  /**
 * Execute a function in a client module.
 * @category ClientModule
 * @param {Object} data
 * @param {string} [data.symbol] - The asset symbol . Either this or the id needs to be defined.
 * @param {string} [data.id] - id of the client module. (For assets this is the first part of the mode)
 * @param {string} data.func - The client module function to be called
 * @param {string} data.data - The data to be passed to the client module function
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.client = function (data, dataCallback, errorCallback) {
    var id;
    var displayId;
    if (data.hasOwnProperty('id')) {
      id = data.id;
      displayId = id;
    } else if (data.hasOwnProperty('symbol')) {
      if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
        id = assets[data.symbol]['mode'].split('.')[0];
        displayId = id + '(' + data.symbol + ')';
      } else {
        if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized.'); }
        if (typeof errorCallback === 'function') {
          errorCallback('Asset ' + data.symbol + ' not initialized.');
        }
        return;
      }
    } else {
      if (DEBUG) { console.error('Either data.id or data.symbol needs to be defined.'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Either data.id or data.symbol needs to be defined.');
      }
    }

    var execute = () => {
      if (clientModules[id].hasOwnProperty(data.func) && typeof clientModules[id][data.func] === 'function') {
        var result;
        try {
          result = clientModules[id][data.func](data.data, dataCallback, errorCallback);
        } catch (e) {
          if (DEBUG) { console.error(e); }// todo more descriptive error
          if (typeof errorCallback === 'function') {
            errorCallback(e);// todo more descriptive error
          }
          return;
        }
        if (typeof result !== 'undefined') { // when nothing is returned, expect it to be async
          dataCallback(result);
        }
      } else {
        if (DEBUG) { console.error('Client module function ' + data.func + ' for ' + displayId + ' not defined or not a function.'); }
        if (typeof errorCallback === 'function') {
          errorCallback('Client module function ' + data.func + ' for ' + displayId + ' not defined or not a function.');
        }
      }
    };
    if (clientModules.hasOwnProperty(id)) {
      execute();
    } else { // if blob not yet available, get it.
      this.rout({host: data.host, query: '/source/deterministic/code/' + id, channel: data.channel}, (blob) => {
        try {
          var code = LZString.decompressFromEncodedURIComponent(blob);
          clientModules[id] = CommonUtils.activate(code);
          clientModuleBlobs[id] = blob;
        } catch (e) {
          if (DEBUG) { console.error(e); }
          if (typeof errorCallback === 'function') {
            errorCallback(e);// TODO prepend error message
          }
          return;
        }
        execute();
      }, errorCallback);
    }
  };
  /**
 * Get the keys associated to a specific asset for current session. Important: handle your private keys confidentially.
 * @category AssetManagement
 * @param {Object} data
 * @param {string} data.symbol - The asset symbol.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.getKeys = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.keys);
    } else {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized.'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Asset ' + data.symbol + ' not initialized.');
      }
    }
  };
  /**
 * Get the address associated to a specific asset for current session.
 * @category AssetManagement
 * @param {Object} data
 * @param {string} data.symbol - The asset symbol.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.getAddress = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.address);
    } else {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized.'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Asset ' + data.symbol + ' not initialized.');
      }
    }
  };
  /**
 * Get the public key associated to a specific asset for current session.
 * @category AssetManagement
 * @param {Object} data
 * @param {string} data.symbol - The asset symbol.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.getPublicKey = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.publickey);
    } else if (typeof errorCallback === 'function') {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized.'); }
      errorCallback('Asset ' + data.symbol + ' not initialized.');
    }
  };
  /**
 * Get the private key associated to a specific asset for current session.
 * @category AssetManagement
 * @param {Object} data
 * @param {string} data.symbol - The asset symbol.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.getPrivateKey = function (data, dataCallback, errorCallback) {
    if (assets.hasOwnProperty(data.symbol) && typeof dataCallback === 'function') {
      dataCallback(assets[data.symbol].data.privatekey);
    } else if (typeof errorCallback === 'function') {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized.'); }
      errorCallback('Asset ' + data.symbol + ' not initialized.');
    }
  };
  /**
 * Create a signed transaction
 * @category Transaction
 * @param {Object} data
 * @param {string} data.symbol - The symbol of the asset.
 * @param {string} data.target - The target address.
 * @param {Number} data.amount - The amount.
 * @param {Number} data.fee - The fee.
 * @param {Object} data.unspent - Pretransaction data.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.signTransaction = function (data, dataCallback, errorCallback) {
    // Error checking:
    // TODO check symbol
    // TODO check amount
    // TODO check target
    if (!assets.hasOwnProperty(data.symbol)) {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not added.'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Asset ' + data.symbol + ' not added.');
      }
      return;
    }
    var asset = assets[data.symbol];
    if (!clientModules.hasOwnProperty(asset['mode'].split('.')[0])) {
      if (DEBUG) { console.error('Asset ' + data.symbol + ' not initialized'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Asset ' + data.symbol + ' not initialized.'); // TODO error message
      }
      return;
    }

    var toInt = function (input, factor) {
      var f = Number(factor);
      var x = new Decimal(String(input));
      return x.times('1' + (f > 1 ? '0'.repeat(f) : '')).toString();
    };

    // helper function to make unspents contain atomic units
    var unspentAtomic = function (input,factor) {
      var unspentsTable = [];
      var changeAtoms;
      if(Object.prototype.toString.call(input.unspents) === '[object Array]') {
        for(var i=0;i<input.unspents.length;i++) {
          unspentsTable[i] = input.unspents[i];
          unspentsTable[i].amount = toInt(unspentsTable[i].amount,factor);
        }
        changeAtoms = toInt(input.change,factor);
      } else {
        changeAtoms = toInt(0,factor);
      }
      return {"unspents":unspentsTable,"change":changeAtoms};
    }

    var fee;
    try {
      fee = toInt((data.fee || asset.fee), asset.feefactor);
      // DEBUG:  console.log(' ##### '+JSON.stringify( asset ));
    } catch (e) {
      if (DEBUG) { console.error(e); }
      if (typeof errorCallback === 'function') {
        errorCallback(e); // TODO error message
      }
      return;
    }
    var amount;
    try {
      amount = toInt(data.amount, asset.factor);
    } catch (e) {
      if (DEBUG) { console.error(e); }
      if (typeof errorCallback === 'function') {
        errorCallback(e); // TODO error message
      }
      return;
    }
    var unspentOutput = data.unspent;
    if(data.unspent && data.unspent.unspents && data.unspent.change) {
      unspentOutput = unspentAtomic(data.unspent,asset['fee-factor']);
    }
    var transactionData = {
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
      unspent: unspentOutput
    };
    // DEBUG: console.log(JSON.stringify(transactionData));
    var checkTransaction;
    try {
      checkTransaction = clientModules[asset['mode'].split('.')[0]].transaction(transactionData, dataCallback); // TODO errorCallback
    } catch (e) {
      if (DEBUG) { console.error(e); }
      if (typeof errorCallback === 'function') {
        errorCallback(e); // TODO prepend error message
      }
      return;
    }
    if (typeof checkTransaction !== 'undefined' && typeof dataCallback === 'function') {
      dataCallback(checkTransaction);
    }
  };
  /**
 * Creates a raw transaction
 * @category Transaction
 * @param {Object} data
 * @param {string} data.symbol - The symbol of the asset
 * @param {string} data.target - The target address
 * @param {Number} data.amount - The amount that should be transferred
 * @param {Number} data.fee    - The fee.
 * @param {string} [data.host] - The host that should be used.
 * @param {string} [data.channel]  - Indicate the channel 'y' for encryption, 'z' for both encryption and compression
 * @param {Function} dataCallback  - Called when the method is succesful. Passes result data.
 * @param {Function} errorCallback - Called when an error occurs. Passes error.
 * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
 */
  this.rawTransaction = function (data, dataCallback, errorCallback, progressCallback) {
    function calcUnspentAmount(data) {
      try{
        return new Decimal(data.amount).plus( (data.hasOwnProperty('fee')?data.fee:assets[data.symbol].fee) ).toString();
      }catch(e){
        //if (DEBUG) { console.error(e); }
        //if (typeof errorCallback === 'function') {
        //  errorCallback(e); // TODO prepend error message
       // }
        return undefined;
      }
    };
    this.sequential({steps: [
      {symbol: data.symbol, channel: data.channel, host: data.host},'addAsset',
      {
        address: {data: {symbol: data.symbol}, step: 'getAddress'},
        publicKey: {data: {symbol: data.symbol}, step: 'getPublicKey'},
      }, 'parallel',
      result => { return {query: '/asset/' + data.symbol + '/unspent/' + result.address + '/' + calcUnspentAmount(data) + '/' + data.target + (result.publicKey?'/'+result.publicKey:''), channel: data.channel, host: data.host}; }, 'rout',
      unspent => { return {symbol: data.symbol, target: data.target, amount: data.amount, fee: data.fee, unspent: unspent}; }, 'signTransaction',
      rawtx => { return escapeString(rawtx); }
    ]}, dataCallback, errorCallback, progressCallback);
  };

  /**
 * Create and execute a transaction
 * @category Transaction
 * @param {Object} data
 * @param {string} data.symbol - The symbol of the asset
 * @param {string} data.target - The target address
 * @param {Number} data.amount - The amount that should be transferred
 * @param {Number} data.fee - The fee.
 * @param {string} [data.host] - The host that should be used.
 * @param {string} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression
 * @param {Function} dataCallback - Called when the method is succesful. Passes result data.
 * @param {Function} errorCallback - Called when an error occurs. Passes error.
 * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
 */
  this.transaction = function (data, dataCallback, errorCallback, progressCallback) {
    this.sequential({steps: [
      data, 'rawTransaction',
      tx => { return { query: '/asset/' + data.symbol + '/push/' + escapeString(tx), channel: data.channel, host: data.host }; }, 'rout'
    ]}, dataCallback, errorCallback, progressCallback);
  };
  /**
 * TODO
 * @category AssetManagement
 * @param {Object} data
 * @param {string} [data.symbol] - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
 */
  this.refreshAsset = function (data, dataCallback, errorCallback,progressCallback) {
    var steps = {};
    for(var symbol in assets){
      var asset = assets[symbol];
      steps[symbol] = {data:
                       [
                         {query:'/asset/'+symbol+'/balance/'+asset.data.address},'rout',
                         function(symbol){
                           return balance => {this.assets[symbol]['balance']=balance; return balance;}
                         }.bind({assets})(symbol)
                       ], step:'sequential'};
    }
    this.parallel(steps, (data)=>{this.asset(undefined,dataCallback,errorCallback,progressCallback)}, errorCallback,progressCallback);
  }
  /**
 * Add a hybridd node as host.
 * @category Host
 * @param {Object} data
 * @param {string} data.host - The hostname TODO  multiple in array?
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.addHost = function (data, dataCallback, errorCallback) {
    if (
      !/^([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) && // relative path "api/"
      !/^(http|https):\/\/[a-z\d]([a-z\d\-]{0,61}[a-z\d])?(\.[a-z\d]([a-z\d\-]{0,61}[a-z\d])?)*(:\d*)?\/([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) && // hostnames  "http://localhost:8080/api"
      !/^(http|https):\/\/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:\d*)?\/([-a-z\d%@_.~+&:]*\/)?$/i.test(data.host) // ipv4 address "http://127.0.0.1:8080/api"
      // TODO ipv6
    ) { //  check if valid hostname is valid
      if (DEBUG) {
        console.error('Host not valid hostname, IPv4, or relative path : "' + data.host + '"  expected: "[protocol://hostnameOrIPv4Address[:portnumber]][/path]/"');
      }
      if (typeof errorCallback === 'function') {
        errorCallback('Host not valid hostname, IPv4, or relative path : "' + data.host + '"  expected: "[protocol://hostnameOrIPv4Address[:portnumber]][/path]/"');
      }
    } else {
      var hybriddNode = new HybriddNode.HybriddNode(data.host);
      hybriddNodes[data.host] = hybriddNode;
      dataCallback(data.host);
    }
  };
  /**
 * Create an encrypted session with a host
 * @category Session
 * @param {Object} data
 * @param {string} data.host - The hostname TODO  multiple in array?
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.login = function (data, dataCallback, errorCallback) {
    if (!user_keys) {
      if (DEBUG) { console.error('No session available.'); }
      if (typeof errorCallback === 'function') { errorCallback('No session available.'); }
    } else if (!data.hasOwnProperty('host')) {
      if (DEBUG) { console.error('No host provided.'); }
      if (typeof errorCallback === 'function') { errorCallback('No host provided.'); }
    } else if (hybriddNodes.hasOwnProperty(data.host)) {
      if(!hybriddNodes[data.host].initialized()){
        hybriddNodes[data.host].init({userKeys: user_keys, connector: connector}, dataCallback, errorCallback);
      }else{
        dataCallback(data.host);
      }
    } else { // host still  needs to be added
      this.addHost({host:data.host}, () => {
        hybriddNodes[data.host].init({userKeys: user_keys, connector: connector}, dataCallback, errorCallback);
      }, errorCallback);
    }
  };

  /**
 * Make a routing call to hybridd node
 * @category Host
 * @param {Object} data
 * @param {string} data.query - The query path. For reference: [Hybridd API]{@link https://wallet1.internetofcoins.org/api/help}
 * @param {string} [data.channel] - Indicate the channel 'y' for encryption, 'z' for both encryption and compression
 * @param {Boolean} [data.meta] - Indicate whether to include meta data (process information)
 * @param {string} [data.host] - Select a specific host, if omitted one will be chosen at random.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.rout = function (data, dataCallback, errorCallback) {
    var encrypted =  data.channel === 'y' || data.channel === 'z';
    if( encrypted && typeof user_keys === 'undefined' ){
      if (DEBUG) { console.error('No session available.'); }
      if (typeof errorCallback === 'function') {errorCallback('No session available.');}
      return;
    }

    var host;
    if (typeof data.host === 'undefined') {
      if(Object.keys(hybriddNodes).length===0){
        if (DEBUG) { console.error('No hosts added.'); }
        if (typeof errorCallback === 'function') {errorCallback('No hosts added.');}
        return;
      }
      var hosts = Object.keys(hybriddNodes);
      host = hosts[Math.floor(Math.random()*hosts.length)]; //TODO loadbalancing, round robin or something
    } else {
      host = data.host;
    }
    if (hybriddNodes.hasOwnProperty(host)) {
      var makeCall = () => {
        switch (data.channel) {
        case 'y' : hybriddNodes[host].yCall({query: data.query, channel: data.channel, userKeys: user_keys, connector: connector}, dataCallback, errorCallback); break;
        case 'z' : hybriddNodes[host].zCall({query: data.query, channel: data.channel, userKeys: user_keys, connector: connector}, dataCallback, errorCallback); break;
        default : hybriddNodes[host].call({query: data.query, connector: connector}, dataCallback, errorCallback); break;
        }
      };
      if(!encrypted || hybriddNodes[host].initialized()){ // if the host is already initialized, make the call
        makeCall();
      }else{  // first login then make the call
        this.login({host},makeCall,errorCallback);
      }
    } else {
      if (DEBUG) { console.error('Host not added'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Host not added');
      }
    }
  };

  var legacy = function  (key) {
    return nacl.to_hex(sha256(user_keys.boxPk)) + '-' + String(key);
  };

  /**
   * Stringify and encrypt data with user keys.
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - TODO
   * @param {Object} data.value - A string, array or object.
   * @param {Boolean} [data.legacy=false] - TODO
   * @param {Boolean} [data.encrypted=true] - whether to encrypt the data with the user key.
   * @param {String} [data.work=true] - whether to perform and submit proof of work.
   * @param {String} [data.host] - TODO
   * @param {String} [data.channel] - TODO
   * @param {Boolean} [data.meta=false] - TODO
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   * @example
   * hybridd.sequential([
   * 'init',
   * {username: '*****', password: '****'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save'
   * {key:'Hello'}, 'load'
   * ]
   *   , (data) => { console.log(JSON.stringify(data)); } // Outputs "World!"
   *   , (error) => { console.error(error); }
   */
  this.save = function(data, dataCallback, errorCallback,progressCallback){

    var redirectCallback;
    if(data.work){ // redirect to do and submit proof of work
      redirectCallback = hash => this.work({hash,host:data.host,channel:data.channel,key:data.key, submit:true},dataCallback, errorCallback,progressCallback);
    }else{
      redirectCallback = dataCallback;
    }

    if(typeof data !== 'object'){
      if (DEBUG) { console.error('Expected an object.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected an object.'); }
    }else if(!data.hasOwnProperty('key') || typeof data.key !=='string'){
      if (DEBUG) { console.error('Expected \'key\' property of string type.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected \'key\' property of string type.'); }
    }else if(!data.hasOwnProperty('value')){
      if (DEBUG) { console.error('Expected \'value\' property.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected \'value\' property.'); }
    }else if(data.encrypted===false){
      // stringify, escape quotes, and encode
      this.rout({host:data.host,query:'/e/storage/set/'+encodeURIComponent(data.key)+'/'+encodeURIComponent(JSON.stringify(data.value).replace(/"/g, '\\\"')),channel:data.channel},redirectCallback , errorCallback,progressCallback);
    }else if(data.legacy===true){
      this.sequential([
        {data:data.value}, 'encrypt',
        result => {return {host:data.host,query:'/e/storage/set/'+encodeURIComponent(legacy(data.key))+'/'+result,channel:data.channel,meta:data.meta};}, 'rout'
      ],redirectCallback, errorCallback,progressCallback);
    }else{
      this.sequential([
        {data:data.value}, 'encrypt',
        result => {return {host:data.host,query:'/e/storage/set/'+encodeURIComponent(data.key)+'/'+result,channel:data.channel,meta:data.meta};}, 'rout'
      ],redirectCallback, errorCallback,progressCallback);
    }
  }


   /**
 * Perform Proof of Work
 * @category Storage
 * @param {Object} data
 * @param {Object} data.hash - The hash that needs to be worked.
 * @param {string} [data.difficulty] - Difficulty level to use.
 * @param {string} [data.submit] - Whether to submit the proof of work
 * @param {Object} [data.key] - Required for submit
 * @param {String} [data.host] - TODO
 * @param {String} [data.channel] - TODO
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
*/
  this.work = function(data, dataCallback, errorCallback,progressCallback) {
    var redirectCallback;
    if(data.submit && data.key){ // redirect to submit proof of work
     redirectCallback = hash => {
        this.rout({query:'/e/storage/work/'+encodeURIComponent(data.key)+'/'+hash, host:data.host,channel:data.channel },dataCallback,errorCallback,progressCallback);
      }
    }else{
      redirectCallback = dataCallback;
    }

    //dataCallback('x');
    proof.solve(data.hash,redirectCallback, errorCallback, data.difficulty);
  }


  /**
   * TODO Stringify and encrypt data with user keys.
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - TODO
   * @param {Boolean} [data.encrypted] - whether to encrypt the data with the user key, true by default.
   * @param {Boolean} [data.legacy] - TODO
   * @param {String} [data.host] - TODO
   * @param {String} [data.channel] - TODO
   * @param {Boolean} [data.meta] - TODO
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   * @example
   * hybridd.sequential([
   * 'init',
   * {username: '*****', password: '****'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save'
   * {key:'Hello'}, 'load'
   * ]
   *   , (data) => { console.log(JSON.stringify(data)); } // Outputs "World!"
   *   , (error) => { console.error(error); }
   */
  this.load = function(data, dataCallback, errorCallback,progressCallback){
    if(typeof data !== 'object'){
      if (DEBUG) { console.error('Expected an object.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected an object.'); }
    }else if(!data.hasOwnProperty('key') || typeof data.key !=='string'){
      if (DEBUG) { console.error('Expected \'key\' property of string type.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected \'key\' property of string type.'); }
    }else if(data.encrypted===false){
      this.rout({host:data.host,query:'/e/storage/get/'+encodeURIComponent(data.key),channel:data.channel,meta:data.meta}, (data)=>{
        dataCallback(decodeURIComponent(data));
      },errorCallback,progressCallback);
    }else if(data.legacy===true){
      this.sequential([
        {host:data.host,query:'/e/storage/get/'+encodeURIComponent(legacy(data.key)),channel:data.channel}, 'rout',
        result => {return {data: result};}, 'decrypt'
      ],dataCallback, errorCallback,progressCallback);
    }else{
      this.sequential([
        {host:data.host,query:'/e/storage/get/'+encodeURIComponent(data.key),channel:data.channel}, 'rout',
        result => {return {data: result};}, 'decrypt'
      ],dataCallback, errorCallback,progressCallback);
    }
  }

    /**
   * Check if data is associated to key
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - TODO
   * @param {Boolean} [data.legacy] - TODO
   * @param {String} [data.host] - TODO
   * @param {String} [data.channel] - TODO
   * @param {Boolean} [data.meta] - TODO
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   * @example
   * hybridd.sequential([
   * 'init',
   * {username: '*****', password: '****'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save'
   * {key:'Hello'}, 'load'
   * ]
   *   , (data) => { console.log(JSON.stringify(data)); } // Outputs "World!"
   *   , (error) => { console.error(error); }
   */
  this.seek = function(data, dataCallback, errorCallback,progressCallback){
    if(typeof data !== 'object'){
      if (DEBUG) { console.error('Expected an object.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected an object.'); }
    }else if(!data.hasOwnProperty('key') || typeof data.key !=='string'){
      if (DEBUG) { console.error('Expected \'key\' property of string type.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected \'key\' property of string type.'); }
    }else if(data.legacy===true){
      this.rout({host:data.host,query:'/e/storage/seek/'+encodeURIComponent(legacy(data.key)),channel:data.channel,meta:data.meta}, (data)=>{
        dataCallback(decodeURIComponent(data));
      },errorCallback,progressCallback);
    }else{
      this.rout({host:data.host,query:'/e/storage/seek/'+encodeURIComponent(data.key),channel:data.channel,meta:data.meta}, (data)=>{
        dataCallback(decodeURIComponent(data));
      },errorCallback,progressCallback);
    }
  }

  /**
   * Retrieve the meta data for a storage key
   * @category Storage
   * @param {Object} data
   * @param {String} data.key - TODO
   * @param {String} [data.host] - TODO
   * @param {String} [data.channel] - TODO
   * @param {Boolean} [data.meta] - TODO
   * @param {Function} dataCallback - Called when the method is succesful.
   * @param {Function} errorCallback - Called when an error occurs.
   * @example
   * hybridd.sequential([
   * 'init',
   * {username: '*****', password: '****'}, 'session',
   * {host: 'http://localhost:1111/'}, 'addHost',
   * {key:'Hello', value:'World!'}, 'save'
   * {key:'Hello'}, 'meta'
   * ]
   *   , (data) => { console.log(JSON.stringify(data)); } // Outputs {time,hash,size,pow,res,n,read}
   *   , (error) => { console.error(error); }
   */
  this.meta = function(data, dataCallback, errorCallback,progressCallback){
    if(typeof data !== 'object'){
      if (DEBUG) { console.error('Expected an object.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected an object.'); }
    }else if(!data.hasOwnProperty('key') || typeof data.key !=='string'){
      if (DEBUG) { console.error('Expected \'key\' property of string type.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected \'key\' property of string type.'); }
    }else{
      this.rout({host:data.host,query:'/e/storage/meta/'+encodeURIComponent(data.key),channel:data.channel,meta:data.meta}, errorCallback,progressCallback);
    }
  }

  /**
 * Stringify and create a DJB2 hash.
 * @category Encryption
 * @param {Object} data
 * @param {Object} data.data - A string, array or object.
 * @param {String} [data.salt] - A string.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.hash = function(data, dataCallback, errorCallback) {
    //TODO only add salt if salt
    //TODO add sha option
    dataCallback(DJB2.hash(JSON.stringify(data.data)+JSON.stringify(data.salt)));
  }

  /**
 * Stringify and encrypt data with user keys.
 * @category Encryption
 * @param {Object} data
 * @param {Object} data.data - A string, array or object.
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 * @example
 * hybridd.sequential([
 * 'init',
 * {username: '***', password: '***'}, 'session',
 * {data:'Hello World!'}, 'encrypt'
 * ]
 * , (data) => { console.log(JSON.stringify(data)); }  // Outputs something like "T3dRd3pUUmdaZ3BnYkFSZ01ZQllBTVNDc01LWWVL3kFKaVFFNDBJMHdSVG9RSUFURUZBRGlwVXpSU0E="
 * , (error) => { console.error(error); }
* );
 */
  this.encrypt = function(data, dataCallback, errorCallback) {
    if (!user_keys) {
      if (DEBUG) { console.error('No session available.'); }
      if (typeof errorCallback === 'function') { errorCallback('No session available.'); }
    }else{
      var result;
      try{
        var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
        var crypt_utf8 = nacl.encode_utf8(JSON.stringify(data.data));
        var crypt_bin = nacl.crypto_box(crypt_utf8, nonce_salt, user_keys.boxPk, user_keys.boxSk);
        result = UrlBase64.safeCompress(nacl.to_hex(crypt_bin));
      }catch(e){
        if (DEBUG) { console.error(e); } // TODO better error message
        if (typeof errorCallback === 'function') { errorCallback(e); } // TODO better error message
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
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 * @example
 * hybridd.sequential([
 * 'init',
 * {username: '***', password: '***'}, 'session',
 * {data:'Hello World!'}, 'encrypt',
 * data=>{return {data:data}}, 'decrypt'
 * ]
 * , (data) => { console.log(JSON.stringify(data)); } // Outputs "Hello World!"
 * , (error) => { console.error(error); }
* );
 */
  this.decrypt = function (data, dataCallback, errorCallback) {
    if (!user_keys) {
      if (DEBUG) { console.error('No session available.'); }
      if (typeof errorCallback === 'function') { errorCallback('No session available.'); }
    }else if(typeof data.data !== 'string'){
      if (DEBUG) { console.error('Expected a string.'); }
      if (typeof errorCallback === 'function') { errorCallback('Expected a string.'); }
    }else{
      var result;
      try {
        var nonce_salt = nacl.from_hex('F4E5D5C0B3A4FC83F4E5D5C0B3A4AC83F4E5D000B9A4FC83');
        var crypt_hex = nacl.from_hex(UrlBase64.safeDecompress(data.data));
        // use nacl to create a crypto box containing the data
        var crypt_bin = nacl.crypto_box_open(crypt_hex, nonce_salt, user_keys.boxPk, user_keys.boxSk);
        result = JSON.parse(nacl.decode_utf8(crypt_bin));
      } catch (err) {
        if (DEBUG) { console.error(e); } // TODO better error message
        if (typeof errorCallback === 'function') { errorCallback(e); } // TODO better error message
        return;
      }
      dataCallback(result);
    }
  };

 /**
 * TODO  Create a new deterministic account with the entropy provided.
 * @category Session
 * @param {Object} data
 * @param {string} [data.entropy] - CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Entropy can be provided. Must be a sufficient random string of at least 482 bytes.
 * @param {Function} [data.offset] - CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Use an offset to create multiple accounts from same entropy.
 * @param {Function} [data.pool] -  CAREFUL! Using this feature incorrectly can reduce your security and privacy. Only use when you know what you're doing. Pool function can be overridden by a custom 1600 byte pool generator.
 * deterministic
 * @param {Function} dataCallback - Called when the method is succesful.
 * @param {Function} errorCallback - Called when an error occurs.
 */
  this.createAccount = function (data, dataCallback, errorCallback) {

    var create = function(entropy, offset){
      var minimalEntropyLength = 411 + 20 + 60;
      if (data.entropy.length <= minimalEntropyLength) {

        if (DEBUG) { console.error('Entropy is of insufficient length. Required > ' + minimalEntropyLength); }
        if (typeof errorCallback === 'function') {
          errorCallback('Entropy is of insufficient length. Required > ' + minimalEntropyLength);
        }
        return;
      }

      var password = hexToBase32(entropy.substr(offset + 20, 60));
      var username = hexToBase32(entropy.substr(offset, 12) +
                                 DJB2.hash(entropy.substr(offset, 12).toUpperCase()).substr(0, 4) +
                                 DJB2.hash(entropy.substr(offset, 12).toLowerCase() + password.toUpperCase()).substr(4, 4));

      dataCallback({username, password});
    }


    if (typeof data.entropy === 'string'){
      create(data.entropy, data.offset||0);
    }else{

      var pool;
      if (typeof data.pool === 'function') {
        pool = data.pool;
      } else {
        pool = function (randomNumber) {
          // randomNumber not used by pool in this instance
          return crypto.randomBytes(1600).toString('hex');
        };
      }

      var entropy = '';
      var maxIndex = 1000 + Math.floor(Math.random() * 256);

      var numberList = new Array(maxIndex).fill(0).map(() => {
        return Math.floor(Math.random() * Math.pow(8, 16));
      });

      var iterate = index => {
        if (index === maxIndex) {
          var offset = Math.floor(Math.random() * 411);
          create(entropy,offset);
        } else {
          entropy = pool(numberList[index]);
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
   * @param {Function} dataCallback - Called with data provided.
   * @param {Function} errorCallback - Ignored
   */
  this.id = (data, dataCallback, errorCallback) => {
    dataCallback(data);
  };

  /**
   * Execute a custom function with callbacks. Usefull for sequential and parallel.
   * @category Flow
   * @param {Object} data
   * @param {Function} data.func - A function expecting a dataCallback, errorCallback and optional progressCallback.
   * @param {Function} data.data - The data to be passed to the function.
   * @param {Function} dataCallback - Called with data provided.
   * @param {Function} errorCallback - Called when an error occurs.
   * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
   */
  this.call = (data, dataCallback, errorCallback, progressCallback) => {
    data.func(data.data, dataCallback, errorCallback, progressCallback);
  };

  /**
   * Sequentually executes functions and passes results to next step.
 * @category Flow
 * @param {Array.<string|Object|Function>} data - Sequential steps to be processed. An object indicates data that is supplied to the next step. A function is a transformation of the data of the previous step and given to the next step. A string is a method that used the data from the last step and supplies to the next step.
   * @param {Function} dataCallback - Called when the method is succesful. Passes result data.
   * @param {Function} errorCallback - Called when an error occurs. Passes error.
   * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
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
      var step = data.steps[0];
      if (typeof step === 'string') {
        if (this.hasOwnProperty(step)) {
          if (DEBUG) { console.log('this.' + step + '(' + JSON.stringify(data.data) + ')'); }

          var subStepProgressCallback;
          if (typeof progressCallback === 'function') {
            subStepProgressCallback = (progress) => {
              progressCallback((currentStep + progress) / totalSteps);
            };
          }

          this[step](data.data, resultData => {
            this.sequential({data: resultData, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
          }, errorCallback, subStepProgressCallback);
        } else {
          if (DEBUG) { console.error('Method "' + step + '" does not exist for IoC.Interface class.'); }
          if (typeof errorCallback === 'function') {
            errorCallback('Method "' + step + '" does not exist for IoC.Interface class.');
          }
        }
      } else if (typeof step === 'object') {
        if (DEBUG) { console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(step)); }
        this.sequential({data: step, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
      } else if (typeof step === 'function') {
        var result = step(data.data);
        if (DEBUG) { console.log(JSON.stringify(data.data) + ' => ' + JSON.stringify(result)); }
        this.sequential({data: result, steps: data.steps.slice(1)}, dataCallback, errorCallback, progressCallback, currentStep + 1, totalSteps);
      }
    }
  };

  /**
   * Parallely executes several steps and collects results in a single object.
 * @category Flow
 * @param {Object} data - Parallel steps to be processed. TODO
   * @param {Object} data.label - TODO
   * @param {Object} data.label.data - TODO
   * @param {Object} data.label.step - TODO
   * @param {Function} dataCallback - Called when the method is succesful. Passes result data.
   * @param {Function} errorCallback - Called when an error occurs. Passes error.
   * @param {Function} progressCallback - Called whenever there is a progress updated. Passes a number between 0 and 1.
   */
  this.parallel = (data, dataCallback, errorCallback, progressCallback) => {
    var steps = data;
    var stepCount = Object.keys(steps).length;

    var resultMarks = {};
    var resultProgress = {};
    for (var i in steps) {
      resultProgress[i] = 0;
    }
    var parallelProgressCallback;
    if (typeof progressCallback === 'function') {
      parallelProgressCallback = () => {
        var totalProgress = 0;
        for (var i in steps) {
          totalProgress += resultProgress[i];
        }
        progressCallback(totalProgress / stepCount);
      };
    }

    var resultData = {};

    if (stepCount === 0) {
      dataCallback({});
      return;
    }
    var dataSubCallback = i => result => {
      if (resultMarks.hasOwnProperty(i)) { return; }
      resultProgress[i] = 1;
      resultMarks[i] = true;
      resultData[i] = result;
      if (typeof progressCallback === 'function') { parallelProgressCallback(); }
      if (Object.keys(resultMarks).length === stepCount) {
        dataCallback(resultData);
      }
    };

    var errorSubCallback = i => error => {
      if (resultMarks.hasOwnProperty(i)) { return; }
      resultMarks[i] = false;
      resultProgress[i] = 1;
      resultData[i] = undefined; // error;
      if (typeof progressCallback === 'function') { parallelProgressCallback(); }
      if (Object.keys(resultMarks).length === stepCount) {
        /* if (errorCount === resultCount) {
            if (DEBUG) { console.error(error); }
            if (typeof errorCallback === 'function') {
              errorCallback(error);
            }
          } else { */
        dataCallback(resultData);
        // }
      }
    };
    var subProgressCallback;
    if (typeof progressCallback === 'function') {
      subProgressCallback = i => progress => {
        resultProgress[i] = progress;
        parallelProgressCallback();
      };
    }
    var executeStep = (i, step, data) => {
      if (typeof step === 'string') {
        if (this.hasOwnProperty(step)) {
          this[step](data, dataSubCallback(i), errorSubCallback(i), subProgressCallback);
        } else {
          if (DEBUG) { console.error('Method "' + step + '" does not exist for IoC.Interface class.'); }
          if (typeof errorCallback === 'function') {
            errorCallback('Method "' + step + '" does not exist for IoC.Interface class.');
          }
        }
      } else if (typeof step === 'function') {
        step(data, dataSubCallback(i), errorSubCallback(i), subProgressCallback);
      }
    };

    for (var i in steps) {
      var step = steps[i];
      if (typeof step === 'object') {
        if (step.hasOwnProperty('step')) {
          if (step.hasOwnProperty('data')) {
            executeStep(i, step.step, step.data);
          } else {
            executeStep(i, step.step, data);
          }
        } else {
          if (DEBUG) { console.error('No step defined.'); }

          if (typeof errorCallback === 'function') {
            errorCallback('No step defined.');
          }
        }
      } else {
        executeStep(i, step, data);
      }
    }
  };
};

module.exports = {Interface};
