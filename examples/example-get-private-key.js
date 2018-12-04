nacl_factory = require('../common/crypto/nacl.js');

var hybrixd = require('../dist/hybrixd.interface.nodejs.js');
var hybrixd = new hybrixd.Interface({http: require('http')});

var username = '';
var password = '';
var symbol = 'eth';
var host = 'http://localhost:1111/';

hybrixd.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: symbol}, 'addAsset',
  {symbol: symbol}, 'getKeys'
]
  , (data) => { console.log(data.privateKey.toString('hex')); }
  , (error) => { console.error(error); }
);
