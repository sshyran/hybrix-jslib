var nacl;
var DEBUG = false;

var HybriddNode = function (host_) {
  var step; // Incremental step. Steps 0 and 2 used for x-authentication, subsequent steps used for y and z chan
  var nonce; // Random value

  var initial_session_data;
  /* generateInitialSessionData(...) => {
    = {
    session_hexkey,
    session_hexsign,
    session_keypair,
    session_nonce,
    session_seckey,
    session_secsign,
    session_signpair
    }
  */
  var secondary_session_data;
  /* generateSecondarySessionData(...) => {
    nonce1_hex,
    nonce2_hex,
    crypt_hex
    }
  */

  var ternary_session_data;
  /* sessionStep1Reply(...) => {
    sess_hex,
    current_nonce
    }
  */

  var server_session_data;
  /*  xAuthFinalize xauth response on step 1 =>
    server_sign_pubkey
    server_session_pubkey
    current_nonce
    crhex
  */
  var host = host_;

  this.xAuthStep0Request = function () {
    step = 0; // TODO error if not x ===undefined
    return '/x/' + initial_session_data.session_hexsign + '/0';
  };

  this.xAuthStep1Request = function (nonce1) {
    step = 1; // TODO error if not x === 0
    try {
      secondary_session_data = generateSecondarySessionData(nonce1, initial_session_data.session_hexkey, initial_session_data.session_signpair.signSk);
    } catch (e) {
      console.log('Error: ' + JSON.stringify(e));
    }
    return '/x/' + initial_session_data.session_hexsign + '/1/' + secondary_session_data.crypt_hex;
  };

  this.xAuthFinalize = function (data, userKeys) {
    server_session_data = data;
    var combined_session_data = {userKeys: userKeys, nonce: nonce};
    Object.assign(combined_session_data, server_session_data, initial_session_data, secondary_session_data);

    ternary_session_data = sessionStep1Reply(data, combined_session_data, () => {});
  };

  this.yCall = function (query, dataCallback, errorCallback, userKeys, options) {
    step++;

    var generalSessionData = getGeneralSessionData({user_keys: userKeys, nonce: ternary_session_data.current_nonce}, step, ternary_session_data.sess_hex);
    /*
      generalSessionData = {
      sessionID,
      clientSessionSecKey,
      serverSessionPubKey,
      sessionNonce
      };
    */

    //    ternary_session_data.current_nonce[23]++;
    var y = ychan_encode_sub({
      sessionID: generalSessionData.sessionID,
      sessionNonce: generalSessionData.sessionNonce,
      serverSessionPubKey: generalSessionData.serverSessionPubKey,
      clientSessionSecKey: generalSessionData.clientSessionSecKey,
      step: step,
      txtdata: query
    });
    this.call('y/' + y, (encdata) => {
      // decode encoded data into text data
      var txtdata = ychan_decode_sub({
        encdata: encdata,
        sessionNonce: generalSessionData.sessionNonce,
        serverSessionPubKey: generalSessionData.serverSessionPubKey,
        clientSessionSecKey: generalSessionData.clientSessionSecKey
      });
      dataCallback(txtdata);
    }, errorCallback, options);
  };

  this.call = function (query, dataCallback, errorCallback, options) { // todo options: {socket,interval, channel}
    var defaultSocket = (host, query, dataCallback, errorCallback) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            dataCallback(xhr.responseText);
          } else if (errorCallback) {
            errorCallback(xhr.responseText);
          }
        }
      };
      xhr.open('GET', host + query, true);
      xhr.send();
    };

    var socket = defaultSocket; // TODO ook dmv options

    socket(host, query, (response) => {
      var data;
      try {
        data = JSON.parse(response);
      } catch (error) {
        errorCallback(error);
      }
      if (data.hasOwnProperty('id') && data.id === 'id') {
        setTimeout(() => {
          socket(host, '/p/' + data.data, (response) => {
            var data;
            try {
              data = JSON.parse(response);
            } catch (error) {
              errorCallback(error);
            } dataCallback(data);
          });
        }, 1000); // TODO fix ugly timeout, do a frequent recheck

        // TODO errorCallback gebruiken bij timeout?
      } else if (dataCallback) { // TODO first check if error = 1
        dataCallback(data);
      } else if (errorCallback) {
        errorCallback(response);
      }
    },
    errorCallback
    );
  };

  this.init = function (successCallback, errorCallback, userKeys, options) {
    nonce = nacl.crypto_box_random_nonce();
    initial_session_data = generateInitialSessionData(nonce);
    this.call(this.xAuthStep0Request(), (response) => {
      this.call(this.xAuthStep1Request(response.nonce1), (response) => {
        this.xAuthFinalize(response, userKeys);
        if (successCallback) { successCallback(); }
      }, errorCallback, {}); // TODO  options
    }, errorCallback, {}); // TODO options
  };
};

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

  this.init = function (callback) {
    nacl_factory.instantiate(function (naclinstance) {
      nacl = naclinstance; // nacl is a global that is initialized here.
      if (typeof callback === 'function') { callback(); }
    });
  };

  this.login = function (username, password) {
    // TODO validate password+username
    this.logout(); // clear current data
    user_keys = generateKeys(password, username, 0);
  };

  this.logout = function () {
    assets = {};
    user_keys = undefined;
  };

  this.initAsset = function (assetDetails, deterministicCodeBlob) {
    deterministic[assetDetails['keygen-base']] = activate(LZString.decompressFromEncodedURIComponent(deterministicCodeBlob));
    assets[assetDetails.symbol] = assetDetails;
    assets[assetDetails.symbol].data = {};
    assets[assetDetails.symbol].data.seed = seedGenerator(user_keys, assetDetails['keygen-base']);
    assets[assetDetails.symbol].data.keys = deterministic[assetDetails['keygen-base']].keys(assets[assetDetails.symbol].data);
    assets[assetDetails.symbol].data.keys.mode = assetDetails.mode.split('.')[1]; // (here submode is named mode confusingly enough)
    assets[assetDetails.symbol].data.address = deterministic[assetDetails['keygen-base']].address(assets[assetDetails.symbol].data.keys);
  };

  this.addAsset = function (symbol, successCallback, errorCallback, options) {
    var host = Object.keys(hybriddNodes)[0]; // TODO choose random?? or pick from options
    // TODO check if valid host
    this.call(host, 'a/' + symbol + '/details', (asset) => {
      var mode = asset.data.mode.split('.')[0];
      this.call(host, 's/deterministic/code/' + mode, (blob) => {
        this.initAsset(asset.data, blob.data);
        if (successCallback) { successCallback(); }
      }, errorCallback, options);
    }, errorCallback, options);
  };
  // TODO addAssets([])

  this.getAddress = function (symbol) {
    if (assets.hasOwnProperty(symbol)) {
      return assets[symbol].data.address;
    } else {
      return undefined;
    }
  };

  this.signTransaction = function (symbol, amount, bla) {
    // TODO return a signed transaction in that can be pushed
  };

  this.addHost = function (host, successCallback, errorCallback, options) {
    var hybriddNode = new HybriddNode(host);
    hybriddNodes[host] = hybriddNode;
    hybriddNode.init(successCallback, errorCallback, user_keys, options);
  };

  // TODO addHosts([])

  // TODO dCall decentralized

  // TODO add xyz chan options error when no session is created
  this.call = function (host, query, dataCallback, errorCallback, options) {
    if (hybriddNodes.hasOwnProperty(host)) {
      hybriddNodes[host].call(query, dataCallback, errorCallback, options);
    }
  };

  this.yCall = function (host, query, dataCallback, errorCallback, options) {
    if (hybriddNodes.hasOwnProperty(host)) {
      hybriddNodes[host].yCall(query, dataCallback, errorCallback, user_keys, options);
    }
  };
};
