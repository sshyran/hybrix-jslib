nacl_factory = require('../../crypto/nacl.js');

var IoC = require('../ioc.nodejs.client.js');
var ioc = new IoC.Interface({http: require('http')});

//IoC credentials:
var username = '';
var password = '';

// Withdrawal paramaters. To withdraw a token, set the token variable to the token symbol (e.g. 'eth.kin'). To withdraw ethereum, set the token to the symbol of ethereum (i.e. 'eth').
var token = 'eth';
var amount = "0.0001";

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
      return { amount: {data: amount, step: 'id'},
        token: {data: {query: '/asset/' + token + '/details'}, step: 'call'},
        
        nonce: {data: {query: '/engine/idex/getNextNonce/' + result.address}, step: 'call'},
        address: {data: result.address, step: 'id'},
        privateKey: {data: {symbol: 'eth'}, step: 'getKeys'}};
    }, 'parallel',
    (result) => {
      return {data: result, id: 'dex_idex', func: 'SignedIdexWithdrawal'}
    }, 'deterministic' ,
    (result) => {
        return {query: '/engine/idex/push/withdraw/' + JSON.stringify(result)}
      }
    , 'call'
  ]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
);

