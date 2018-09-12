nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('..dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('http')});

// IoC credentials:
var username = '';
var password = '';

// Parameters of the order
var token = 'eth.kin';
var amountETH = '0.2';
var amountToken = '890';
var isOrderToBuyToken = false;

var host = 'http://localhost:1111/';

hybridd.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: 'eth'}, 'addAsset',
  {
    address: {data: {symbol: 'eth'}, step: 'getAddress'}
  }, 'parallel',
  (result) => {
    return { amountETH: {data: amountETH, step: 'id'},
      amountToken: {data: amountToken, step: 'id'},
      isBuyOrder: {data: isOrderToBuyToken, step: 'id'},
      token: {data: {query: '/asset/' + token + '/details'}, step: 'call'},

      nonce: {data: {query: '/engine/idex/getNextNonce/' + result.address}, step: 'call'},
      address: {data: result.address, step: 'id'},
      privateKey: {data: {symbol: 'eth'}, step: 'getKeys'}};
  }, 'parallel',
  (result) => {
    return {data: result, id: 'dex_idex', func: 'makeSignedIdexOrder'};
  }, 'client',
  (result) => {
    return {query: '/engine/idex/push/order/' + JSON.stringify(result)};
  },
  'call'
]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
);
