nacl_factory = require('../../crypto/nacl.js');

var hostname = 'http://wallet-uat.internetofcoins.org/api/';

// command line options and init
var stdio = require('stdio');
var ops = stdio.getopt({
  'userid': {key: 'u', args: 1, description: 'Set username'},
  'passwd': {key: 'p', args: 1, description: 'Set password'},
  'newaccount': {key: 'n', description: 'Generate new wallet'},
  'sendtransaction': {key: 't', args: 3, description: 'Send transaction [argument: symbol] [argument: amount] [argument: target_address]'},
  'addasset': {key: 'a', args: 1, description: 'Add asset to wallet [argument: symbol]'},
  'addassets': {key: 'A', args: 1, description: 'Add assets to wallet [argument: symbol1,symbol2,symbol3]'},
  'getaddress': {key: 'g', args: 1, description: 'Add asset to wallet [argument: symbol]'},
  'pubkey': {key: 'P', args: 1, description: 'Get public key from wallet [argument: symbol]'},
  'privkey': {key: 'S', args: 1, description: 'Get private key from wallet [argument: symbol]'},
  'keypair': {key: 'K', args: 1, description: 'Get public and private key from wallet [argument: symbol]'},
  'rawtransaction': {key: 'r', args: 3, description: 'Create a raw transaction [argument: symbol] [argument: amount] [argument: target_address]'},
  'string': {key: 'e', args: 0, description: 'Make escaped string output for rawtransaction'},
  'eth_forcenonce': {key: 'E', args: 1, description: 'Force nonce transaction number for Ethereum [argument: integer]'}
});

if (ops.userid) { userid = ops.userid; }
if (ops.passwd) { passwd = ops.passwd; }

var symbol = ops.pubkey ? ops.pubkey :
             ops.privkey ? ops.privkey :
             ops.keypair ? ops.keypair :
             typeof ops.rawtransaction!=='undefined' && ops.rawtransaction[0] ? ops.rawtransaction[0] : null;

/*
var base = symbol.split('.')[0];
if(base === 'xcp' || base === 'omni') {
  base = 'btc';
}*/

var IoC = require('../ioc.nodejs.client.js');
var ioc = new IoC.Interface({http: require('http')});

if (ops.rawtransaction) {
  var amount = ops.rawtransaction[1];
  var target = ops.rawtransaction[2];

  ioc.sequential([
      'init',
      {username: userid, password: passwd}, 'login',
      {host: hostname}, 'addHost',
      {symbol: symbol}, 'addAsset',
      {
        details: {data: {query: '/asset/' + symbol + '/details'}, step: 'call'},
        address: {data: {symbol: symbol}, step: 'getAddress'}
      }, 'parallel',
      (result) => {
        // DEBUG:
        // console.log("\n"+'Details: '+JSON.stringify(result.details)+"\n");
        // console.log('Source address: '+result.address+"\n");
        return {
          details: {data: result.details, step: 'id'},
          address: {data: result.address, step: 'id'},
          unspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + (Number(amount) + Number(result.details.fee)) + '/' + result.address }, step: 'call'} //   TODO add public key
        }
      }, 'parallel',
      (result) => {
        return {
          tx: {data: {symbol: symbol, target: result.address, unspent: result.unspent, amount: Number(amount), fee: result.details.fee}, step: 'signTransaction'}
        }
      }, 'parallel',
    ]
    , (data) => { console.log(data.tx+"\n"); }
    , (error) => { console.error(error); }
  );
}
