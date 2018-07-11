// ychan encrypts an API query before sending it to the router
ychan = function (usercrypto, step, txtdata) {
  // decodes only from UrlBase64 for now, must be real usercrypto!
  var encdata = ychan_encode(usercrypto, step, txtdata);
  return 'y/' + encdata;
};

ychan_obj = function (usercrypto, step, encdata) {
  return JSON.parse(ychan_decode(usercrypto, step, encdata));
};

/*
  data = {
  sessionID
  sessionNonce
  serverSessionPubKey
  clientSessionSecKey
  step,
  txtdata
  }
*/
ychan_encode_sub = function (data) {
  var cryptUtf8 = nacl.encode_utf8(data.txtdata);
  // use nacl to create a crypto box containing the data
  var cryptBin = nacl.crypto_box(
    cryptUtf8,
    data.sessionNonce,
    data.serverSessionPubKey,
    data.clientSessionSecKey
  );
  var encdata = nacl.to_hex(cryptBin);
  // DEBUG: console.log(sessionid+'/'+step+'/'+encdata); // this seems to work properly
  return data.sessionID + '/' + data.step + '/' + UrlBase64.safeCompress(encdata);
};

// sessionData = sessionHex
ychan_encode = function (usercrypto, step, txtdata) {
  var sessionData = document.querySelector('#session_data').textContent; // fetch relevant info from #session_data
  var sessionSecData = getGeneralSessionData(usercrypto, step, sessionData);

  return ychan_encode_sub({
    sessionID: sessionSecData.sessionID,
    sessionNonce: sessionSecData.sessionNonce,
    serverSessionPubKey: sessionSecData.serverSessionPubKey,
    clientSessionSecKey: sessionSecData.clientSessionSecKey,
    step,
    txtdata
  });
};

/*
data = {
encdata
sessionNonce
serverSessionPubKey
clientSessionSecKey
}
*/
ychan_decode_sub = function (data) {
  // TODO: add check for encdata.error:0?
  var txtdata;
  var hexdata = UrlBase64.safeDecompress(data.encdata);
  // DEBUG: alert('Ychan decode nonce conhex: '+nonce_conhex+' Hex data: '+hexdata);
  if (hexdata != null) {
    var cryptHex = nacl.from_hex(hexdata);
    // use nacl to create a crypto box containing the data
    var cryptBin = nacl.crypto_box_open(
      cryptHex,
      data.sessionNonce,
      data.serverSessionPubKey,
      data.clientSessionSecKey
    );
    txtdata = nacl.decode_utf8(cryptBin);
  } else { txtdata = null; }
  return txtdata;
};

ychan_decode = function (usercrypto, step, encdata) {
  var sessionData = document.querySelector('#session_data').textContent;
  var txtdata = null;
  if (encdata !== null) {
    // decompress the data into a hex string
    var sessionSecData = getGeneralSessionData(usercrypto, step, sessionData);
    txtdata = ychan_decode_sub({
      encdata,
      sessionNonce: sessionSecData.sessionNonce,
      serverSessionPubKey: sessionSecData.serverSessionPubKey,
      clientSessionSecKey: sessionSecData.clientSessionSecKey
    });
  }
  return txtdata;
};

function getGeneralSessionData (usercrypto, step, sessionData) {
  var sessionObject = readSession(
    usercrypto.user_keys,
    usercrypto.nonce,
    sessionData,
    couldNotRetrieveSessionDataAlert// TODO global callback, should be removed!!
  );
  // TODO dit netjes doen
  Decimal.set({
    precision: 100,
    rounding: Decimal.ROUND_HALF_UP,
    toExpNeg: 0,
    toExpPos: 100
  });
  var sessionID = sessionObject.session_pubsign;
  // TODO: check server public signing of incoming object
  // DEBUG: alert('Incoming object: '+JSON.stringify(session_object)); // works!
  var serverSessionPubKey = nacl.from_hex(sessionObject.server_pubkey);
  var clientSessionSecKey = nacl.from_hex(sessionObject.session_seckey);
  // calculate current session nonce from nonce1 + nonce2 + step
  var nonce1Dec = new Decimal(hex2dec.toDec(sessionObject.nonce1));
  var nonce2Dec = new Decimal(hex2dec.toDec(sessionObject.nonce2));
  var stepDec = new Decimal(step);
  // added using decimal-light plus function for looooong decimals
  var nonceConstr = nonce1Dec.plus(nonce2Dec).plus(stepDec).toDecimalPlaces(64);
  // convert nonce_construct integer string back into hex
  var nonceConvert = hex2dec.toHex(nonceConstr.toFixed(0).toString());
  var nonceConhex = nonceConvert.substr(2, nonceConvert.length);
  var sessionNonce = nacl.from_hex(nonceConhex);

  return {
    sessionID,
    clientSessionSecKey,
    serverSessionPubKey,
    sessionNonce
  };
}

function couldNotRetrieveSessionDataAlert () {
  console.log('Error: Could not retrieve session data.');
}
