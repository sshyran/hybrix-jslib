nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('../dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('http')});

var username = '';
var password = '';
var symbol = 'eth';
var host = 'http://localhost:1111/';

hybridd.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: symbol}, 'addAsset',
  {symbol: symbol}, 'getKeys'
]
  , (data) => { console.log(data.privateKey.toString('hex')); }
  , (error) => { console.error(error); }
);
