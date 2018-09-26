nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('../dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('http')});

// IoC credentials:
var username = 'I4X4KG67OBET5TS5';
var password = 'HD6L5K4JEOM2PZNE';

// Parameters of the order
var sendAsset = 'waves.vtn';
var sendAmount = "1";
var receiveAsset = 'waves.wct';
var receiveAmount = "100";
var maxLifetimeInSeconds = 3600
var matcherFee = 300000 // default matcher fee found in python implementation: https://github.com/PyWaves/PyWaves/blob/master/__init__.py#L16

var host = 'http://localhost:1111/';

hybridd.sequential([
  'init',
  {username: username, password: password}, 'session',
  {host: host}, 'addHost',
  {symbol: 'waves'}, 'addAsset',
  {symbol: 'waves'}, 'getKeys',
  (result) => {
    return { 
    spendAmount:   {data: sendAmount, step: 'id'},
    receiveAmount: {data: receiveAmount, step: 'id'},
    spendAsset:    {data: {query: '/asset/' + sendAsset    + '/details'}, step: 'call'},
    receiveAsset:  {data: {query: '/asset/' + receiveAsset + '/details'}, step: 'call'},
    
    matcherFee: {data: matcherFee, step: 'id'},
    maxLifetime: {data: maxLifetimeInSeconds, step: 'id'},
    matcherPublicKey: {data: {query: '/engine/dex_waves/getMatcherPublicKey'}, step: 'call'},
    address: {data: {symbol: 'waves'}, step: 'getAddress'},
    publickey: {data: result.keyPair.publicKey, step: 'id'},
    privKey:   {data: result.keyPair.privateKey, step: 'id'}}
  }, 'parallel',
  (result) => {
    return {data: result, id: 'dex_waves', func: 'makeSignedWavesOrder'};
  }, 'client',
  (result) => {
    console.log(result)
    return {query: '/engine/dex_waves/push/' + JSON.stringify(result)};
  },
  'call'
]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
);
