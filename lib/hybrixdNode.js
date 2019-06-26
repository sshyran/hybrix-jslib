const ychan = require('../common/ychan');
const zchan = require('../common/zchan');
const CommonUtils = require('../common/index');

const DEFAULT_FOLLOWUP_RETRIES = 20;
const DEFAULT_RETRIES = 3;

const hybrixdNode = function (host_) {
  let step; // Incremental step. Steps 0 and 2 used for x-authentication, subsequent steps used for y and z chan
  let nonce; // Random value

  let initial_session_data;
  /* generateInitialSessionData(...) => {
     = {
     session_hexkey,
     session_hexsign,
     session_keypair,
     session_nonce,option
     session_seckey,
     session_secsign,
     session_signpair
     }
  */
  let secondary_session_data;
  /* generateSecondarySessionData(...) => {
     nonce1_hex,
     nonce2_hex,
     crypt_hex
     }
  */

  let ternary_session_data;
  /* sessionStep1Reply(...) => {
     sess_hex,
     current_nonce
     }
  */

  let server_session_data;
  /*  xAuthFinalize xauth response on step 1 =>
      server_sign_pubkey
      server_session_pubkey
      current_nonce
      crhex
  */
  const host = host_;

  this.xAuthStep0Request = function () {
    step = 0; // TODO error if not x ===undefined
    return '/x/' + initial_session_data.session_hexsign + '/0';
  };

  this.xAuthStep1Request = function (nonce1) {
    step = 1; // TODO error if not x === 0
    try {
      secondary_session_data = CommonUtils.generateSecondarySessionData(nonce1, initial_session_data.session_hexkey, initial_session_data.session_signpair.signSk);
    } catch (e) {
      if (DEBUG) { console.log('Error: ' + JSON.stringify(e)); }
    }
    return '/x/' + initial_session_data.session_hexsign + '/1/' + secondary_session_data.crypt_hex;
  };

  this.xAuthFinalize = function (data, userKeys) {
    server_session_data = data;
    let combined_session_data = {userKeys: userKeys, nonce: nonce};
    Object.assign(combined_session_data, server_session_data, initial_session_data, secondary_session_data);
    ternary_session_data = CommonUtils.sessionStep1Reply(data, combined_session_data, () => {});
  };

  this.yCall = function (data, dataCallback, errorCallback) {
    /* data = {
       query,
       channel: 'y'|'z'
       userKeys,
       meta
       }
    */

    step++;

    const generalSessionData = ychan.getGeneralSessionData({user_keys: data.userKeys, nonce: ternary_session_data.current_nonce}, step, ternary_session_data.sess_hex);
    /*
      generalSessionData = {
      sessionID,
      clientSessionSecKey,
      serverSessionPubKey,
      sessionNonce
       connector
      };
    */
    //    ternary_session_data.current_nonce[23]++;
    const y = ychan.encode_sub({
      sessionID: generalSessionData.sessionID,
      sessionNonce: generalSessionData.sessionNonce,
      serverSessionPubKey: generalSessionData.serverSessionPubKey,
      clientSessionSecKey: generalSessionData.clientSessionSecKey,
      step: step,
      txtdata: data.query
    });

    this.call({query: data.channel + '/' + y, connector: data.connector, meta: true, retries: data.retries}, (encdata) => {
      // decode encoded data into text data
      const txtdata = ychan.decode_sub({
        encdata: encdata,
        sessionNonce: generalSessionData.sessionNonce,
        serverSessionPubKey: generalSessionData.serverSessionPubKey,
        clientSessionSecKey: generalSessionData.clientSessionSecKey
      });

      if (data.channel === 'y') {
        let result;
        try {
          result = JSON.parse(txtdata);
        } catch (error) {
          if (DEBUG) { console.error(error); }
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          }
          return;
        }
        if (typeof result === 'object' && result.id === 'id') {
          const followUp = retries => {
            if (retries === 0) {
              if (DEBUG) { console.error('Followup Retry limit exceeded'); }
              errorCallback('Followup Retry limit exceeded');
            } else {
              this.yCall({query: '/p/' + result.data, channel: data.channel, userKeys: data.userKeys, connector: data.connector, meta: data.meta}, (response) => {
                if (response.hasOwnProperty('error') && response.error !== 0) {
                  if (DEBUG) { console.error(response); }
                  if (typeof errorCallback === 'function') {
                    errorCallback(response.info);
                  }
                } else if (response.stopped !== null) {
                  dataCallback(data.meta ? response : response.data);
                } else {
                  setTimeout(followUp, 500, retries - 1); // TODO parametrize, add timeout
                }
              },
              errorCallback);
            }
          };
          followUp(data.retries || DEFAULT_FOLLOWUP_RETRIES);
        } else {
          dataCallback(result);
        }
      } else {
        dataCallback(txtdata);
      }
    }, errorCallback);
  };

  this.zCall = function (data, dataCallback, errorCallback) {
    if (typeof errorCallback !== 'function') {
      if (DEBUG) { console.log('A NO ERROR FUNC!!!!'); }
    }

    /* data = {
       query,
       channel: 'z'
       userKeys
       connector
       }
    */
    const encodedQuery = zchan.encode({user_keys: data.userKeys, nonce: ternary_session_data.current_nonce}, step, data.query);
    this.yCall({query: encodedQuery, channel: 'z', userKeys: data.userKeys, connector: data.connector, retries: data.retries}, encodedData => {
      const txtdata = zchan.decode_sub(encodedData);
      let result;

      try {
        result = JSON.parse(txtdata);
      } catch (error) {
        if (DEBUG) { console.error(error); }
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        }
        return;
      }

      if (typeof result === 'object' && result.id === 'id') {
        const followUp = retries => {
          if (retries === 0) {
            if (DEBUG) { console.error('Followup Retry limit exceeded'); }
            errorCallback('Followup Retry limit exceeded');
          } else {
            this.zCall({query: '/p/' + result.data, channel: data.channel, userKeys: data.userKeys, connector: data.connector, meta: data.meta}, (response) => {
              if (response.hasOwnProperty('error') && response.error !== 0) {
                if (DEBUG) { console.error(response); }
                if (typeof errorCallback === 'function') {
                  errorCallback(response.info);
                }
              } else if (response.stopped !== null) {
                dataCallback(data.meta ? response : response.data);
              } else {
                setTimeout(followUp, 500, retries - 1); // TODO parametrize, add timeout
              }
            },
            errorCallback);
          }
        };
        followUp(data.retries || DEFAULT_FOLLOWUP_RETRIES);
      } else {
        dataCallback(result);
      }
    }, errorCallback);
  };

  this.call = function (data, dataCallback, errorCallback) { // todo options: {connector,interval, timeout}
    /* data = {
       query,
       connector,
       meta
       }
    */

    const errorCallbackWithRetries = error => {
      data.retries = (typeof data.retries === 'undefined') ? DEFAULT_RETRIES : data.retries - 1;
      if (data.retries <= 0) {
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        }
      } else {
        setTimeout(() => this.call(data, dataCallback, errorCallback), 100); // TODO parameterize
      }
    };

    const meta = !!data.meta; // meta is a boolean indicating whether to strip the meta data from a call
    const xhrSocket = (host, query, dataCallback, errorCallback) => {
      const xhr = new data.connector.XMLHttpRequest();
      xhr.onreadystatechange = e => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            dataCallback(xhr.responseText);
          } else {
            if (DEBUG) { console.error(xhr.responseText); }
            if (typeof errorCallback === 'function') {
              errorCallback(xhr.responseText);
            }
          }
        }
      };
      xhr.timeout = 15000; // TODO parameterize
      xhr.ontimeout = function (e) {
        if (DEBUG) {
          console.log('TIMEOUT!' + data.query);
        }
        errorCallback(e);
      };
      xhr.open('GET', host + query, true); // TODO make method an option
      xhr.send();
    };

    const httpSocket = (host, query, dataCallback, errorCallback) => {
      data.connector.http.get(host + query, (res) => {
        // const contentType = res.headers['content-type'];

        if (res.statusCode < 200 || res.statusCode > 299) {
          const error = ('Request error: Status Code: ' + res.statusCode);

          if (DEBUG) { console.error(error); }
          res.resume(); // consume response data to free up memory
          console.log('1>>>', query, res.statusCode);
          if (typeof errorCallback === 'function') {
            errorCallback(error); // TODO error.message
          }
          return;
        }

        res.setEncoding('utf8');
        const rawData = [];
        res.on('data', (chunk) => { rawData.push(chunk); });
        res.on('timeout', () => {
          console.log('2>>>', query);
          res.resume();
          if (DEBUG) { console.error('Request timed out.'); }

          if (typeof errorCallback === 'function') {
            errorCallback('Request timed out.');
          }
        });
        res.on('error', (e) => {
          console.log('3>>>', query);
          res.resume();
          if (DEBUG) { console.error(`Got error: ${e.message}`); }

          if (typeof errorCallback === 'function') {
            errorCallback(`Got error: ${e.message}`);
          }
        });
        res.on('end', () => {
          res.resume();
          dataCallback(rawData.join(''));
        });
      }).on('error', (e) => {
        console.log('4>>>', query);
        if (DEBUG) { console.error(`Got error: ${e.message}`); }

        if (typeof errorCallback === 'function') {
          errorCallback(`Got error: ${e.message}`);
        }
      }).setTimeout(10000, () => { // TODO parametrize
        console.log('5>>>', query);
        // handle timeout here
        if (DEBUG) { console.error('Request timed out.'); }
        if (typeof errorCallback === 'function') {
          errorCallback('Request timed out');
        }
      });
    };

    const httpsSocket = (host, query, dataCallback, errorCallback) => {
      data.connector.https.get(host + query, (res) => { // TODO make method an option
        // const contentType = res.headers['content-type'];

        if (res.statusCode < 200 || res.statusCode > 299) {
          const error = ('Request error: Status Code: ' + res.statusCode);

          if (DEBUG) { console.error(error); }
          res.resume(); // consume response data to free up memory
          if (typeof errorCallback === 'function') {
            errorCallback(error); // TODO error.message
          }
          return;
        }

        res.setEncoding('utf8');
        const rawData = [];
        res.on('data', (chunk) => { rawData.push(chunk); });
        res.on('timeout', () => {
          res.resume();
          if (DEBUG) { console.error('Request timed out.'); }

          if (typeof errorCallback === 'function') {
            errorCallback('Request timed out.');
          }
        });
        res.on('error', (e) => {
          res.resume();
          if (DEBUG) { console.error(`Got error: ${e.message}`); }

          if (typeof errorCallback === 'function') {
            errorCallback(`Got error: ${e.message}`);
          }
        });
        res.on('end', () => {
          res.resume();
          dataCallback(rawData.join(''));
        });
      }).on('error', (e) => {
        if (DEBUG) { console.error(`Got error: ${e.message}`); }

        if (typeof errorCallback === 'function') {
          errorCallback(`Got error: ${e.message}`);
        }
      }).setTimeout(15000, () => { // TODO parametrize
        // handle timeout here
        if (DEBUG) { console.error('Request timed out.'); }
        if (typeof errorCallback === 'function') {
          errorCallback('Request timed out');
        }
      });
    };

    const localSocket = (host, query, dataCallback, errorCallback) => {
      dataCallback(data.connector.local.rout(query));
    };

    let connector;
    if (data.connector.hasOwnProperty('XMLHttpRequest')) { connector = xhrSocket; }
    if (data.connector.hasOwnProperty('http') && host.startsWith('http://')) { connector = httpSocket; }
    if (data.connector.hasOwnProperty('https') && host.startsWith('https://')) { connector = httpsSocket; }
    if (data.connector.hasOwnProperty('local')) { connector = localSocket; }
    if (data.connector.hasOwnProperty('custom')) { connector = data.connector.custom; }

    if (typeof connector === 'undefined') {
      if (DEBUG) { console.error('Error: No http request connector method available.'); }
      if (typeof errorCallback === 'function') {
        errorCallback('Error: No http request connector method available.');
      }
      return;
    }
    connector(host, data.query, (response) => {
      let data;
      try {
        data = JSON.parse(response);
      } catch (error) {
        if (DEBUG) { console.error(error); }
        // if (typeof errorCallback === 'function') {
        errorCallbackWithRetries(error);
        // }
        return;
      }
      if (data.hasOwnProperty('id') && data.id === 'id') {
        const followUp = retries => {
          if (retries === 0) {
            if (DEBUG) { console.error('Followup Retry limit exceeded'); }
            errorCallback('Followup Retry limit exceeded');
          } else {
            connector(host, '/p/' + data.data, (response) => {
              let parsedResponse;
              try {
                parsedResponse = JSON.parse(response);
              } catch (error) {
                if (DEBUG) { console.error(error); }
                errorCallbackWithRetries(error);
                return;
              }
              if (parsedResponse.hasOwnProperty('error') && parsedResponse.error !== 0) {
                if (DEBUG) { console.error(parsedResponse); }
                errorCallbackWithRetries(parsedResponse.data);
              } else if (parsedResponse.stopped !== null) {
                dataCallback(meta ? parsedResponse : parsedResponse.data);
              } else {
                setTimeout(followUp, 500, retries - 1); // TODO parametrize, add timeout
              }
            }, errorCallbackWithRetries);
          }
        };
        followUp(data.retries || DEFAULT_FOLLOWUP_RETRIES);

        // TODO errorCallback gebruiken bij timeout?
      } else if (dataCallback) {
        if (data.hasOwnProperty('error') && data.error !== 0) {
          if (DEBUG) { console.error(data); }
          if (typeof errorCallback === 'function') {
            errorCallback(response);
          }
          return;
        }
        dataCallback(meta ? data : data.data);
      }
    },
    errorCallbackWithRetries
    );
  };

  this.initialized = function () { return step > 1; };

  this.init = function (data, successCallback, errorCallback) {
    /* data =
       {
       userKeys
       connector
       }
    */
    // TODO error if already logged in
    nonce = nacl.crypto_box_random_nonce();
    initial_session_data = CommonUtils.generateInitialSessionData(nonce);
    this.call({query: this.xAuthStep0Request(), connector: data.connector, meta: true}, (response) => {
      this.call({query: this.xAuthStep1Request(response.nonce1), connector: data.connector, meta: true}, (response) => {
        this.xAuthFinalize(response, data.userKeys);
        if (successCallback) { successCallback(host); }
      }, errorCallback);
    }, errorCallback);
  };
};

module.exports = {hybrixdNode};
