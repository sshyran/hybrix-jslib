nacl_factory = require('../../crypto/nacl.js');

var IoC = require('../ioc.nodejs.client.js');
var ioc = new IoC.Interface({http: require('http')});

var username = '';
var password = '';
var symbol = 'eth';
var host = 'http://localhost:1111/';

ioc.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: symbol}, 'addAsset',
  {symbol: symbol}, 'getKeys'
]
  , (data) => { console.log(data.privateKey.toString('hex')); }
  , (error) => { console.error(error); }
);
