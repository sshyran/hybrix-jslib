var nacl;

var IoC = function(){
  var user_keys;
  var assets = {};
  var deterministic = {};

  // returns public/secret keypair
  // for encrypting (boxPk/boxSk)
  function generateKeys (secret, salt, position) {
    // normalise strings with stringtolower and stringtoupper
    // alert(secret.toUpperCase()+'/'+salt.toLowerCase());

    // Key Seed I
    // create bitArrays from secret and salt
    var secr_ba = sjcl.codec.utf8String.toBits(secret.toUpperCase());
    var salt_ba = sjcl.codec.utf8String.toBits(salt.toLowerCase());
    // use pbkdf2 to calculate key_seed (64 * 4 bytes = 256 bits = 32 bytes)
    var key_seed1 = sjcl.misc.pbkdf2(secr_ba, salt_ba, 5000 + position, 4096, false);

    // Key Seed II
    // reverse secret upper case + upper case salt
    var rsecret = secret.toUpperCase().split('').reverse().join('');
    // create bitArrays from reverse secret
    var rsecr_ba = sjcl.codec.utf8String.toBits(rsecret);
    var usalt_ba = sjcl.codec.utf8String.toBits(salt.toUpperCase());
    // use pbkdf2 to calculate key_seed (64 * 4 bytes = 256 bits = 32 bytes)
    var key_seed2 = sjcl.misc.pbkdf2(rsecr_ba, usalt_ba, 5000 + position, 4096, false);

    // use two seeds to generate master key seed
    var key_seed3 = sjcl.misc.pbkdf2(key_seed1, key_seed2, 5000 + position, 4096, false);
    var key_seed_str3 = sjcl.codec.hex.fromBits(key_seed3);
    // DEBUG alert(key_seed_str3+'['+key_seed_str3.length+']');
    var final_key_seed = nacl.from_hex(key_seed_str3);
    // create user master key
    var new_key = nacl.crypto_box_keypair_from_seed(final_key_seed);
    // animation possible here
    return new_key;
  }

  function seedGenerator (user_keys,asset) {
    // this salt need not be too long (if changed: adjust slice according to tests)
    var salt = '1nT3rN3t0Fc01NsB1nD5tH3cRyPt05Ph3R3t093Th3Rf0Rp30Pl3L1k3M34nDy0U';
    // slightly increases entropy by XOR obfuscating and mixing data with a key
    function xorEntropyMix (key, str) {
      var c = '';
      var k = 0;
      for (i = 0; i < str.length; i++) {
        c += String.fromCharCode(str[i].charCodeAt(0).toString(10) ^ key[k].charCodeAt(0).toString(10)); // XORing with key
        k++;
        if (k >= key.length) { k = 0; }
      }
      return c;
    }
    // return deterministic seed  GL.usercrypto.
    return UrlBase64.Encode(xorEntropyMix(nacl.to_hex(user_keys.boxPk), xorEntropyMix(asset.split('.')[0], xorEntropyMix(salt, nacl.to_hex(user_keys.boxSk))))).slice(0, -2);
  }


  function activate(code) {
    if (typeof code === 'string') {
      eval('var deterministic = (function(){})(); ' + code); // interpret deterministic library into an object
      return deterministic;
    } else {
      console.log('Cannot activate deterministic code!');
      return function () {};
    }
  };


  this.init =function(callback){

    nacl_factory.instantiate(function(naclinstance){
      nacl = naclinstance; // nacl is a global that is initialized here.
      if(typeof callback === "function"){callback();}
    }.bind({callback:callback}));
  };

  this.login = function(username,password){
    user_keys  = generateKeys(password,username,0);
  };

  this.logout = function(){
    deterministic = {};
    assets = {};
    user_key = undefined;
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

  this.signTransaction = function(symbol,amount,bla){
    //return a signed transaction in that can be pushed
  };
}
