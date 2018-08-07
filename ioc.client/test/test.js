/* TODO
   - extend wavalidator for waves and ark

   Account is valid then it is a valid Base58 string and the length of corresponding array is 26 bytes. Version of address (1st byte) is equal to 1. The network byte (2nd byte) is equal to network ID. The checksum of address (last 4 bytes) is correct.

   3PBUkL5rphESXxq1yJzW2erVzTTKAXXeCUo

   - for the assets requiring a public key for unspents, add those to sample, collect those from seed
   - do not retrieve blob if it is already retrieved

   - wrapperlib issue for waves, bts

   - parallel option to call dataCallback at every result (top show intermediate updates)
*/

function testAsset (symbol) {
  var testAmount = 0.0001;

  return { data: [
    {symbol: symbol}, 'addAsset',
    {
      sample: {data: {query: '/asset/' + symbol + '/sample'}, step: 'call'},
      details: {data: {query: '/asset/' + symbol + '/details'}, step: 'call'},
      status: {data: {query: '/asset/' + symbol + '/status'}, step: 'call'},
      address: {data: {symbol: symbol}, step: 'getAddress'},
      publicKey: {data: {symbol: symbol}, step: 'getPublicKey'}
    },
    'parallel',
    (result) => {
      return {
        sample: {data: result.sample, step: 'id'},
        status: {data: result.status, step: 'id'},
        details: {data: result.details, step: 'id'},
        address: {data: result.address, step: 'id'},

        sampleValid: {data: {query: '/source/wavalidator/' + symbol + '/' + result.sample.address}, step: 'call'},
        sampleBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.sample.address}, step: 'call'},
        sampleUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.sample.address + '/' + (Number(testAmount) + Number(result.details.fee)) + '/' + result.address + '/' + result.sample.publicKey }, step: 'call'},
        sampleHistory: {data: {query: '/asset/' + symbol + '/history/' + result.sample.address}, step: 'call'},
        sampleTransaction: {data: {query: '/asset/' + symbol + '/transaction/' + result.sample.transaction}, step: 'call'},

        seedValid: {data: {query: '/source/wavalidator/' + symbol + '/' + result.address}, step: 'call'},
        seedBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.address}, step: 'call'},
        seedUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + (Number(testAmount) + Number(result.details.fee)) + '/' + result.sample.address + '/' + result.publicKey }, step: 'call'},
        seedHistory: {data: {query: '/asset/' + symbol + '/history/' + result.address}, step: 'call'}
      };
    },
    'parallel',
    (result) => {
      return {
        sample: {data: result.sample, step: 'id'},
        status: {data: result.status, step: 'id'},
        details: {data: result.details, step: 'id'},
        sampleValid: {data: result.sampleValid + ' ' + result.sample.address, step: 'id'},
        sampleBalance: {data: result.sampleBalance, step: 'id'},
        sampleUnspent: {data: result.sampleUnspent, step: 'id'},
        sampleHistory: {data: result.sampleHistory, step: 'id'},
        sampleTransaction: {data: result.sampleTransaction, step: 'id'},
        //        sampleSign: {data: {symbol: symbol, target: result.address, unspent: result.sampleUnspent, amount: testAmount, fee: result.details.fee}, step: 'signTransaction'},

        seedValid: {data: result.seedValid + ' ' + result.address, step: 'id'},
        seedBalance: {data: result.seedBalance, step: 'id'},
        seedUnspent: {data: result.seedUnspent, step: 'id'},
        seedHistory: {data: result.seedHistory, step: 'id'},
        seedSign: {data: {symbol: symbol, target: result.sample.address, unspent: result.seedUnspent, amount: testAmount, fee: result.details.fee}, step: 'signTransaction'}

      };
    },
    'parallel'
  ],
  step: 'sequential'
  };
}

var validStatus = status => typeof status === 'object';
var validDetails = details => typeof details === 'object';
var validValid = valid => typeof valid === 'string' && valid.startsWith('valid');
var validBalance = (balance, factor) => typeof balance !== 'undefined' && balance !== null && !isNaN(balance) && balance.toString().indexOf('.') !== -1 && balance.toString().split('.')[1].length === Number(factor);
var validUnspent = unspent => typeof unspent !== 'undefined';
var validHistory = history => typeof history === 'object';
var validSample = sample => typeof sample === 'object';
var validTransaction = transaction => typeof transaction === 'object';
var validSign = sign => typeof sign !== 'undefined' && sign !== false && sign !== '' && sign !== null && sign !== 'false' && sign !== '[UNDER MAINTENANCE]';

var renderCell = (valid, data, counter) => {
  var title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/\"/g, '');
  counter.total++;
  if (valid) {
    counter.valid++;
    return '<td style="background-color:green" title="' + title + '">Pass</td>';
  } else {
    return '<td style="background-color:red"  title="' + title + '">Fail</td>';
  }
};

var renderTable = (data) => {
  var counter = {valid: 0, total: 0};

  var r = '<table><tr><td>Symbol</td><td colspan="2"></td><td colspan="6">Sample</td><td colspan="5">Generated</td></tr>';
  r += '<tr><td></td><td>Status</td><td>Details</td><td>Sample</td><td>Valid</td><td>Balance</td><td>Unspent</td><td>History</td><td>Transaction</td><td>Valid</td><td>Balance</td><td>Unspent</td><td>History</td><td>Sign</td></tr>';
  for (var symbol in data) {
    r += '<tr>';
    r += '<td>' + symbol + '</td>';
    if (typeof data[symbol] !== 'undefined') {
      r += renderCell(validStatus(data[symbol].status), data[symbol].status, counter);
      r += renderCell(validDetails(data[symbol].details), data[symbol].details, counter);
      r += renderCell(validSample(data[symbol].sample), data[symbol].sample, counter);
      r += renderCell(validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter);
      r += renderCell(validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter);
      r += renderCell(validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter);
      r += renderCell(validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter);
      r += renderCell(validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter);

      r += renderCell(validValid(data[symbol].seedValid), data[symbol].seedValid, counter);
      r += renderCell(validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter);
      r += renderCell(validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter);
      r += renderCell(validHistory(data[symbol].seedHistory), data[symbol].seedHistory, counter);
      r += renderCell(validSign(data[symbol].seedSign), data[symbol].seedSign, counter);
    } else {
      r += '<td colspan="13" style="background-color:red">Fail</td>';
    }
    r += '</tr>';
  }
  r += '</table>';
  r += '<h1>' + (counter.valid / counter.total * 100) + '%</h1>';
  console.log(data);
  document.body.innerHTML = r;
};

function go () {
  var ioc = new IoC.Interface({XMLHttpRequest: XMLHttpRequest});
  ioc.sequential([
    'init',
    {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
    {host: 'http://localhost:1111/'}, 'addHost',
    //    {}, 'createAccount',
    //    data => { console.log(data); },
    //    {symbol: 'dummy', amount: 100, channel: 'y'}, 'transaction',

    // TODO retrieve all asset sddd
    // TODO filter tokens

    {
      dummy: testAsset('dummy'),
      eth: testAsset('eth'),
      ark: testAsset('ark'),
      bch: testAsset('bch'),
      btc: testAsset('btc'), // Error: Expected property "1" of type BigInteger, got n
      bts: testAsset('bts'),
      burst: testAsset('burst'), // Error: unspents not working properly ERROR
      dgb: testAsset('dgb'), // TypeError: undefined is not an object (evaluating 't.unspent.unspents.map')
      etc: testAsset('etc'), //  TypeError: undefined is not an object (evaluating 'r.unspent.nonce')
      exp: testAsset('exp'),
      lsk: testAsset('lsk'),
      ltc: testAsset('ltc'), //  Error: Invalid network version
      nxt: testAsset('nxt'), // unspents not working properly ERROR
      omni: testAsset('omni'), // TypeError: undefined is not an object (evaluating 'n.unspent.unspents')
      rise: testAsset('rise'),
      shift: testAsset('shift'),
      ubq: testAsset('ubq'), // details.fee =null>
      waves: testAsset('waves'),
      xcp: testAsset('xcp'), // Error: Expected property "1" of type Satoshi, got Number -546
      xel: testAsset('xel'), // unspents not working properly ERROR
      xem: testAsset('xem'),
      zec: testAsset('zec')
    },
    'parallel'

  ]
    , renderTable
    , (error) => { console.error(error); }
  );
}
