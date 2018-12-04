nacl_factory = require('../common/crypto/nacl.js');

var hybrixd = require('../dist/hybrixd.interface.nodejs.js');
var hybrixd = new hybrixd.Interface({http: require('http')});

// IoC credentials:
var username = '';
var password = '';

// Parameters of the order
var sendAsset = 'waves';
var sendAmount = "0.01";
var receiveAsset = 'waves.usd';
var receiveAmount = "0.1";
var maxLifetimeInSeconds = 3600 // maximum lifetime is one month
var matcherFee = 300000 // default matcher fee found in python implementation: https://github.com/PyWaves/PyWaves/blob/master/__init__.py#L16

var host = 'http://localhost:1111/';

hybrixd.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: 'waves'}, 'addAsset',
  {symbol: 'waves'}, 'getKeys',
  (result) => {
    return {
    spendAmount:   {data: sendAmount, step: 'id'},
    receiveAmount: {data: receiveAmount, step: 'id'},
    spendAsset:    {data: {query: '/asset/' + sendAsset    + '/details'}, step: 'rout'},
    receiveAsset:  {data: {query: '/asset/' + receiveAsset + '/details'}, step: 'rout'},

    matcherFee: {data: matcherFee, step: 'id'},
    maxLifetime: {data: maxLifetimeInSeconds, step: 'id'},
    matcherPublicKey: {data: {query: '/engine/dex_waves/getMatcherPublicKey'}, step: 'rout'},
    address: {data: {symbol: 'waves'}, step: 'getAddress'},
    publickey: {data: result.keyPair.publicKey, step: 'id'},
    privKey:   {data: result.keyPair.privateKey, step: 'id'}}
  }, 'parallel',
  (result) => {
    return {
      parameters: {data: result, step: 'id'},
      signedTransaction: {data: {data: result, id: 'dex_waves', func: 'makeSignedWavesOrder'}, step: 'client'}
      };
  }, 'parallel',
  (result) => {
    return {
      response: {data: {query: '/engine/dex_waves/push/' + JSON.stringify(result.signedTransaction)}, step: 'rout'},
      parameters: {data: result.parameters, step: 'id'}
    };
  },
  'parallel',
  (result) => {
    if( result.response.hasOwnProperty('message') && result.response.message == 'Pair should be reverse' ) {
      parametersSwappedAssets = result.parameters
      parametersSwappedAssets.swap = true;
      return {
        signedTransaction: {data: {data: parametersSwappedAssets, id: 'dex_waves', func: 'makeSignedWavesOrder'}, step: 'client'}
      };
    } else {
      return {
        response: {data: result.response, step: 'id'}
      };
    }
  },
  'parallel',
  (result) => {
    if(result.hasOwnProperty('signedTransaction')) {
      return {
        response: {data: {query: '/engine/dex_waves/push/' + JSON.stringify(result.signedTransaction)}, step: 'rout'}
      };
    } else {
      return {
        response: {data: result.response, step: 'id'}
      };
    }
  },
  'parallel'
]
  , (data) => { console.log(data.response); }
  , (error) => { console.error(error); }
);
