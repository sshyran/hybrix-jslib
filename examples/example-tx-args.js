nacl_factory = require('../common/crypto/nacl.js');

//var hybrixd = require('../dist/hybrixd.interface.nodejs.js');
var hybrixd = require('../lib/interface.js');
var hybrixd = new hybrixd.Interface({http: require('http')});
var ProgressBar = require('progress');
var stdio = require('stdio');

function makeProgressBar(title) {
  bar = new ProgressBar(' [.] '+title+': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 76-title.length,
    total: 100
  });  
}

//var hostname = 'http://wallet-uat.internetofcoins.org/api/';
var hostname = 'http://127.0.0.1:1111/';

// command line options and init
var ops = stdio.getopt({
  'userid': {key: 'u', args: 1, description: 'Set username'},
  'passwd': {key: 'p', args: 1, description: 'Set password'},
  'newaccount': {key: 'n', description: 'Generate new wallet'},
  'getaddress': {key: 'g', args: 1, description: 'Add asset to wallet [argument: symbol]'},
  'rawtransaction': {key: 'r', args: 3, description: 'Create a raw transaction [argument: symbol] [argument: amount] [argument: target_address]'},
  'sendtransaction': {key: 't', args: 3, description: 'Send transaction [argument: symbol] [argument: amount] [argument: target_address]'},
  // TODO: 'addasset': {key: 'a', args: 1, description: 'Add asset to wallet [argument: symbol]'},
  // TODO: 'addassets': {key: 'A', args: 1, description: 'Add assets to wallet [argument: symbol1,symbol2,symbol3]'},
  'pubkey': {key: 'P', args: 1, description: 'Get public key from wallet [argument: symbol]'},
  'privkey': {key: 'S', args: 1, description: 'Get private key from wallet [argument: symbol]'},
  'keypair': {key: 'K', args: 1, description: 'Get public and private key from wallet [argument: symbol]'},
  'string': {key: 'e', args: 0, description: 'Make escaped string output for rawtransaction'},
  'quiet': {key: 'q', args: 0, description: 'No extra output'},
  'eth_forcenonce': {key: 'E', args: 1, description: 'Force nonce transaction number for Ethereum [argument: integer]'}
});
var userid;
var passwd;
if (ops.userid) { userid = ops.userid; }
if (ops.passwd) { passwd = ops.passwd; }

var symbol = ops.pubkey ? ops.pubkey
  : ops.privkey ? ops.privkey
    : ops.keypair ? ops.keypair
      : typeof ops.rawtransaction !== 'undefined' && ops.rawtransaction[0] ? ops.rawtransaction[0] : null;

/*
var base = symbol.split('.')[0];
if(base === 'xcp' || base === 'omni') {
  base = 'btc';
} */

var progress = [];

var actions = [
  'init',
  {username: userid, password: passwd}, 'session',
  {host: hostname}, 'addHost'
];

if (ops.getaddress) {
  progress.push('getaddress');
  actions.push({symbol:ops.getaddress});
  actions.push('addAsset');
  actions.push({symbol:ops.getaddress});
  actions.push('getAddress');
}

if (ops.pubkey) {
  progress.push('pubkey');
  actions.push({symbol:ops.pubkey});
  actions.push('addAsset');
  actions.push({symbol:ops.pubkey});
  actions.push('getPublicKey');
}

if (ops.rawtransaction) {
  progress.push('rawtx');
  var amount = ops.rawtransaction[1];
  var target = ops.rawtransaction[2];
  actions.push({symbol:symbol, amount:Number(amount), target:target });
  actions.push('rawTransaction');
}

// show progress
makeProgressBar(progress.join(','));

// take action
hybrixd.sequential( 
  actions
  , (data) => { if(!ops.quiet) { bar.update(1); } console.log(data + "\n"); }
  , (error) => { console.error("\n"+'Error: ' + error); }
  , ops.quiet ? undefined : (progress) => { if(!ops.quiet) { bar.update(progress); } }
);
