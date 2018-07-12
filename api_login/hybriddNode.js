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

  this.yCall = function (data, dataCallback, errorCallback) {
    /* data = {
       query,
       channel: 'y'|'z'
       options
       userKeys
       }
    */

    step++;

    var generalSessionData = getGeneralSessionData({user_keys: data.userKeys, nonce: ternary_session_data.current_nonce}, step, ternary_session_data.sess_hex);
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
      txtdata: data.query
    });
    this.call(data.channel + '/' + y, (encdata) => {
      // decode encoded data into text data
      var txtdata = ychan_decode_sub({
        encdata: encdata,
        sessionNonce: generalSessionData.sessionNonce,
        serverSessionPubKey: generalSessionData.serverSessionPubKey,
        clientSessionSecKey: generalSessionData.clientSessionSecKey
      });
      if (data.channel === 'y') {
        try {
          data = JSON.parse(txtdata);
        } catch (error) {
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          }
          return;
        }
        dataCallback(data);
      } else {
        dataCallback(txtdata);
      }
    }, errorCallback, data.options);
  };

  this.zCall = function (data, dataCallback, errorCallback) {
    /* data = {
       query,
       channel: 'z'
       options
       userKeys
       }
    */
    var encodedQuery = zchan_encode({user_keys: data.userKeys, nonce: ternary_session_data.current_nonce}, step, data.query);
    this.yCall({query: encodedQuery, channel: 'z', options: data.options, userKeys: data.userKeys}, encodedData => {
      var txtdata = zchan_code_sub(encodedData);
      var data;
      try {
        data = JSON.parse(txtdata);
      } catch (error) {
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        }
        return;
      }
      dataCallback(data);
    }, errorCallback);
  };

  this.call = function (query, dataCallback, errorCallback, options) { // todo options: {socket,interval, channel}
    var defaultSocket = (host, query, dataCallback, errorCallback) => {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            dataCallback(xhr.responseText);
          } else if (typeof errorCallback === 'function') {
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
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        }
        return;
      }
      if (data.hasOwnProperty('id') && data.id === 'id') {
        var interval = setInterval(() => {
          socket(host, '/p/' + data.data, (response) => {
            var data;
            try {
              data = JSON.parse(response);
            } catch (error) {
              if (typeof errorCallback === 'function') {
                errorCallback(error);
              }
              return;
            }
            if (data.error !== 0) {
              if (typeof errorCallback === 'function') {
                errorCallback(data.info);
              }
            } else if (data.stopped !== null) {
              clearInterval(interval);
              dataCallback(data);
            }
          });
        }, 100); // TODO fix ugly timeout, do a frequent recheck

        // TODO errorCallback gebruiken bij timeout?
      } else if (dataCallback) { // TODO first check if error = 1
        dataCallback(data);
      } else if (typeof errorCallback === 'function') {
        errorCallback(response);
      }
    },
    errorCallback
    );
  };

  this.init = function (data, successCallback, errorCallback) {
    /* data =
    {
    userKeys
    options
    }
  */
    nonce = nacl.crypto_box_random_nonce();
    initial_session_data = generateInitialSessionData(nonce);
    this.call(this.xAuthStep0Request(), (response) => {
      this.call(this.xAuthStep1Request(response.nonce1), (response) => {
        this.xAuthFinalize(response, data.userKeys);
        if (successCallback) { successCallback(); }
      }, errorCallback, data.option);
    }, errorCallback, data.options);
  };
};
