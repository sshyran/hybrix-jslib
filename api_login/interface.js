var nacl;
var DEBUG = false;

var IoC = function(){
  var user_keys;
  var assets = {};
  var deterministic = {};
  var initial_session_data;
  var secondary_session_data;

  this.init =function(callback){
    nacl_factory.instantiate(function(naclinstance){
      nacl = naclinstance; // nacl is a global that is initialized here.
      if(typeof callback === "function"){callback();}
    }.bind({callback:callback}));
  };

  this.login = function(username,password){
    user_keys  = generateKeys(password,username,0);
    initial_session_data = generateInitialSessionData(0);
  };

  this.logout = function(){
    deterministic = {};
    assets = {};
    user_key = undefined;
    initial_session_data = undefined;
    secondary_session_data = undefined;
  }

  this.initAsset = function (assetDetails,deterministicCodeBlob){
    deterministic[assetDetails["keygen-base"]] = activate(LZString.decompressFromEncodedURIComponent(deterministicCodeBlob));
    console.log(Object.keys(deterministic[assetDetails["keygen-base"]]));

    assets[assetDetails.symbol] = assetDetails;
    assets[assetDetails.symbol].data = {};
    assets[assetDetails.symbol].data.seed = seedGenerator(user_keys,assetDetails["keygen-base"]);
    assets[assetDetails.symbol].data.keys = deterministic[assetDetails["keygen-base"]].keys(assets[assetDetails.symbol].data);
    assets[assetDetails.symbol].data.keys.mode = assetDetails.mode.split('.')[1]; // (here submode is named mode confusingly enough)
    assets[assetDetails.symbol].data.address = deterministic[assetDetails["keygen-base"]].address(assets[assetDetails.symbol].data.keys);
  };

  this.getAddress = function(symbol){
    return assets[symbol].data.address;
  }

  this.xAuthStep0Request = function(){
    return '/xauth/'+initial_session_data.session_hexkey+'/0';
  }

  this.xAuthStep1Request = function(nonce1){
    secondary_session_data = generateSecondarySessionData(nonce1, initial_session_data.session_hexkey, initial_session_data.session_secsign); //TODO
    var data;//TODO
    var sessionData; //TODO
    var cb; //TODO

    var reply = sessionStep1Reply(data, sessionData, cb);
    //  sess_hex,
    //  current_nonce
    return '/xauth/'+initial_session_data.session_hexkey+'/1/'+sess_hex;
  }

  this.yChanRequest = function(path){
    var encrypted_path;//TODO;
    return '/ychan/'+initial_session_data.session_hexkey+'/'+nonce+'/'+encrypted_path;
  }

  this.zChanRequest = function(path){
    var encrypted_path;//TODO;
    return '/zchan/'+initial_session_data.session_hexkey+'/'+nonce+'/'+encrypted_path;
  }

  this.yChanDecode = function(response){}//TODO
  this.zChanDecode = function(response){}//TODO

  this.signedTransaction = function(symbol,amount,bla){
    //return a signed transaction in that can be pushed
  };
}
