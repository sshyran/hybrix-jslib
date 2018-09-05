nacl_factory = require('../../crypto/nacl.js');

var IoC = require('../ioc.nodejs.client.js');
var ioc = new IoC.Interface({http: require('http')});

//IoC credentials:
var username = '';
var password = '';

// Parameters of the order that needs to be cancelled (double check that the 'nonceOfOrder' is indeed set to the nonce of the order you want to cancel)
var token = 'eth.kin';
var amountETH = "0.2";
var amountToken = "890";
var isOrderToBuyToken = false;
var nonceOfOrder = 25;

var host = 'http://localhost:1111/';

ioc.sequential([
    'init',
    {username: username, password: password}, 'login',
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
        nonceOfOrder: {data: nonceOfOrder, step: 'id'},
        
        nonce: {data: {query: '/engine/idex/getNextNonce/' + result.address}, step: 'call'},
        address: {data: result.address, step: 'id'},
        privateKey: {data: {symbol: 'eth'}, step: 'getKeys'}};
    }, 'parallel',
    (result) => {
      return {data: result, id: 'dex_idex', func: 'cancelSignedIdexOrder'}
    }, 'deterministic',
    (result) => {
        return {query: '/engine/idex/push/cancel/' + JSON.stringify(result)}
      }
    , 'call'
  ]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
);
