/* TODO
- extent wavalidator for waves and dummy

Account is valid then it is a valid Base58 string and the length of corresponding array is 26 bytes. Version of address (1st byte) is equal to 1. The network byte (2nd byte) is equal to network ID. The checksum of address (last 4 bytes) is correct.

3PBUkL5rphESXxq1yJzW2erVzTTKAXXeCUo

- for the assets requiring a public key for unspents, add those to sample, collect those from seed
- do not retrieve blob if it is already retrieved

*/

function go () {
  var symbol = 'btc';
  var ioc = new IoC.Interface({XMLHttpRequest: XMLHttpRequest});
  ioc.sequential([
    'init',
    {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
    {host: 'http://localhost:1111/'}, 'addHost',
    {symbol: symbol}, 'addAsset',
    {symbol: 'dummy', amount: 100, channel: 'y'}, 'transaction',

    // TODO retrieve all asset
    // TODO filter tokens
    {
      sample: {data: {query: '/asset/' + symbol + '/sample'}, step: 'call'},
      details: {data: {query: '/asset/' + symbol + '/details'}, step: 'call'},
      status: {data: {query: '/asset/' + symbol + '/status'}, step: 'call'},
      address: {data: {symbol: symbol}, step: 'getAddress'}
    },
    'parallel',
    (result) => {
      return {
        sampleValid: {data: {query: '/source/wavalidator/' + symbol + '/' + result.sample.address}, step: 'call'},
        sampleBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.sample.address}, step: 'call'},
        sampleUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.sample.address + '/' + result.address + '/0.0001'}, step: 'call'}, // TODO add public key
        sampleHistory: {data: {query: '/asset/' + symbol + '/history/' + result.sample.address}, step: 'call'},
        sampleTransaction: {data: {query: '/asset/' + symbol + '/transaction/' + result.sample.transaction}, step: 'call'},

        seedValid: {data: {query: '/source/wavalidator/' + symbol + '/' + result.address}, step: 'call'},
        seedBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.address}, step: 'call'},
        seedUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + result.sample.address + '/0.0001'}, step: 'call'}, //   TODO add public key
        seedHistory: {data: {query: '/asset/' + symbol + '/history/' + result.address}, step: 'call'}
      };
    },
    'parallel'
    /*
    */
  ]
    , (data) => { console.log('Succes', data); }
    , (error) => { console.error(error); }
  );
}
