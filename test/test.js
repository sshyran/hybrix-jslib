let ProgressBar;

const DEFAULT_AMOUNT = 0.00001;


function makeProgressBar (title) {
  bar = new ProgressBar(' [.] ' + title + ': [:bar] :percent, eta: :etas', {
    complete: '▓',
    incomplete: '░',
    width: 76 - title.length,
    total: 100
  });
}

function getParameterByName (name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[[\]]/g, '\\$&');
  let regex = new RegExp('[?&]' + name.toLowerCase() + '(=([^&#]*)|&|#|$)');

  let results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function testAsset (symbol) {
  return { data: [
    {symbol: symbol}, 'addAsset',
    {
      sample: {data: {query: '/asset/' + symbol + '/sample'}, step: 'rout'},
      test: {data: {query: '/asset/' + symbol + '/test'}, step: 'rout'},
      details: {data: {query: '/asset/' + symbol + '/details'}, step: 'rout'},
      address: {data: {symbol: symbol}, step: 'getAddress'},
      publicKey: {data: {symbol: symbol}, step: 'getPublicKey'}
    },
    'parallel',
    (result) => {
      return {
        sample: {data: result.sample, step: 'id'},
        test: {data: result.test, step: 'id'},
        details: {data: result.details, step: 'id'},
        address: {data: result.address, step: 'id'},

        sampleValid: {data: {query: '/asset/' + symbol + '/validate/' + result.sample.address}, step: 'rout'},
        sampleBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.sample.address}, step: 'rout'},
        sampleUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.sample.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.address + '/' + result.sample.publicKey}, step: 'rout'},
        // sampleHistory: {data: {query: '/asset/' + symbol + '/history/' + result.sample.address}, step: 'rout'},
        // sampleTransaction: {data: {query: '/asset/' + symbol + '/transaction/' + result.sample.transaction}, step: 'rout'},

        seedValid: {data: {query: '/asset/' + symbol + '/validate/' + result.address}, step: 'rout'},
        seedBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.address}, step: 'rout'},
        seedUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.sample.address + '/' + result.publicKey}, step: 'rout'}
        // seedHistory: {data: {query: '/asset/' + symbol + '/history/' + result.address}, step: 'rout'}
      };
    },
    'parallel',
    (result) => {
      return {
        test: {data: result.test, step: 'id'},
        sample: {data: result.sample, step: 'id'},
        details: {data: result.details, step: 'id'},
        sampleValid: {data: result.sampleValid + ' ' + result.sample.address, step: 'id'},
        sampleBalance: {data: result.sampleBalance, step: 'id'},
        sampleUnspent: {data: result.sampleUnspent, step: 'id'},
        // sampleHistory: {data: result.sampleHistory, step: 'id'},
        // sampleTransaction: {data: result.sampleTransaction, step: 'id'},

        seedValid: {data: result.seedValid + ' ' + result.address, step: 'id'},
        seedBalance: {data: result.seedBalance, step: 'id'},
        seedUnspent: {data: result.seedUnspent, step: 'id'},
        seedSign: {data: {symbol: symbol, amount: DEFAULT_AMOUNT, target: result.sample.address, validate:false, unspent:result.test.hasOwnProperty('unspent')?result.test.unspent:result.seedUnspent}, step: 'rawTransaction'}
        // seedHistory: {data: result.seedHistory, step: 'id'},
      };
    },
    'parallel'
  ],
  step: 'sequential'
  };
}

let validDetails = details => typeof details === 'object' && details !== null;
let validValid = valid => typeof valid === 'string' && valid.startsWith('valid');
let validBalance = (balance, factor) => typeof balance !== 'undefined' && balance !== null && !isNaN(balance) && balance.toString().indexOf('.') !== -1 && balance.toString().split('.')[1].length === Number(factor);
let validUnspent = unspent => typeof unspent !== 'undefined' && unspent !== null;
let validHistory = history => typeof history === 'object' && history !== null;
let validSample = sample => typeof sample === 'object' && sample !== null;
let validTransaction = transaction => typeof transaction === 'object' && transaction !== null;
let validSign = sign => typeof sign === 'string';

let renderCellCLI = (valid, data, counter) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '');
  counter.total++;
  if (valid) {
    counter.valid++;
    return '\033[32m OK \033[0m';
  } else {
    return '\033[31mFAIL\033[0m';
  }
};

let renderTableCLI = (data) => {
  let counter = {valid: 0, total: 0};

  let r = '\n';
  r += ' #     SAMPLE                                      GENERATED                       ' + '\n';

  r += '      ┌──────┬─────┬────┬──────┬──────┬────┬──────┬──────┬────┐' + '\n';
  r += '      │Detail│Sampl│Vald│Balnce│Unspnt│Vald│Balnce│Unspnt│Sign│' + '\n';
  for (let symbol in data) {
    r += '      ├──────┼─────┼────┼──────┼──────┼────┼──────┼──────┼────┤' + '\n';
    r += symbol.substr(0, 5) + '     '.substr(0, 5 - symbol.length) + ' │';
    if (typeof data[symbol] !== 'undefined') {
      r += ' '+renderCellCLI(validDetails(data[symbol].details), data[symbol].details, counter) + ' │';
      r += renderCellCLI(validSample(data[symbol].sample), data[symbol].sample, counter) + ' │';
      r += renderCellCLI(validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter) + '│';
      r +=' '+ renderCellCLI(validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter) + ' │';
      r += ' '+renderCellCLI(validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter) + ' │';
      //      r += renderCellCLI(validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter) + '│';
      //      r += renderCellCLI(validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter) + '│';
      r += renderCellCLI(validValid(data[symbol].seedValid), data[symbol].seedValid, counter) + '│';
      r += ' '+renderCellCLI(validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter) + ' │';
      r += ' '+renderCellCLI(validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter) + ' │';
      //      r += renderCellCLI(validHistory(data[symbol].seedHistory), data[symbol].seedHistory, counter) + '│';
      r += renderCellCLI(validSign(data[symbol].seedSign), data[symbol].seedSign, counter) + '│';
      r += '\n';
    } else {
      r += ' \033[31mFAIL\033[0m │\033[31mFAIL\033[0m │\033[31mFAIL\033[0m│ \033[31mFAIL\033[0m │ \033[31mFAIL\033[0m │\033[31mFAIL\033[0m│ \033[31mFAIL\033[0m │ \033[31mFAIL\033[0m │\033[31mFAIL\033[0m│ !' + '\n';
    }
  }
  r += '      └──────┴─────┴────┴──────┴──────┴────┴──────┴──────┴────┘' + '\n';
  r += '\n';
  r += '      SUCCESS RATE: ' + (((counter.valid / counter.total) || 0) * 100) + '%' + '\n';
  // console.log(data);
  console.log(r);
};

let renderCellWeb = (valid, data, counter) => {
  let title;
  if (typeof data === 'object') {
    title = JSON.stringify(data);
  } else {
    title = String(data);
  }
  title = title.replace(/"/g, '');
  counter.total++;
  if (valid) {
    counter.valid++;
    return '<td style="background-color:green" title="' + title + '">Pass</td>';
  } else {
    return '<td style="background-color:red"  title="' + title + '">Fail</td>';
  }
};

let renderTableWeb = (data) => {
  let counter = {valid: 0, total: 0};

  let r = '<table><tr><td>Symbol</td><td colspan="2"></td><td colspan="6">Sample</td><td colspan="5">Generated</td></tr>';
  r += '<tr><td></td><td>Details</td><td>Sample</td><td>Valid</td><td>Balance</td><td>Unspent</td>';
  // r+='<td>History</td><td>Transaction</td>';
  r += '<td>Valid</td><td>Balance</td><td>Unspent</td>';
  // r+='<td>History</td>'
  r += '<td>Sign</td></tr>';
  for (let symbol in data) {
    r += '<tr>';
    r += '<td>' + symbol + '</td>';
    if (typeof data[symbol] !== 'undefined') {
      r += renderCellWeb(validDetails(data[symbol].details), data[symbol].details, counter);
      r += renderCellWeb(validSample(data[symbol].sample), data[symbol].sample, counter);
      r += renderCellWeb(validValid(data[symbol].sampleValid), data[symbol].sampleValid, counter);
      r += renderCellWeb(validBalance(data[symbol].sampleBalance, data[symbol].details.factor), data[symbol].sampleBalance, counter);
      r += renderCellWeb(validUnspent(data[symbol].sampleUnspent), data[symbol].sampleUnspent, counter);
      // DISABLED      r += renderCellWeb(validHistory(data[symbol].sampleHistory), data[symbol].sampleHistory, counter);
      // DISABLED      r += renderCellWeb(validTransaction(data[symbol].sampleTransaction), data[symbol].sampleTransaction, counter);

      r += renderCellWeb(validValid(data[symbol].seedValid), data[symbol].seedValid, counter);
      r += renderCellWeb(validBalance(data[symbol].seedBalance, data[symbol].details.factor), data[symbol].seedBalance, counter);
      r += renderCellWeb(validUnspent(data[symbol].seedUnspent), data[symbol].seedUnspent, counter);
      // DISABLED      r += renderCellWeb(validHistory(data[symbol].seedHistory), data[symbol].seedHistory, counter);
      r += renderCellWeb(validSign(data[symbol].seedSign), data[symbol].seedSign, counter);
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

function go (mode) {
  // TODO retrieve all asset
  // TODO filter tokens

  let host = 'http://localhost:1111/';

  let hybrix;
  let renderTable;
  let progressCallback;
  let symbolsToTest;
  if (mode === 'node') {
    ProgressBar = require('progress');
    makeProgressBar('test progress');
    progressCallback = progress => { bar.update(progress); };
    // cli options

    let stdio = require('stdio');

    // command line options and init
    let ops = stdio.getopt({
      'symbol': {key: 's', args: 1, description: 'Select a symbol or comma separated symbols to run test'},
      'debug': {key: 'd', args: 0, description: 'Output debug messages.'},
      'host': {key: 'h', args: 1, description: 'Set host Defaults to :' + host}
      // TODO 'quiet': {key: 'q', args: 0, description: 'No extra output other than raw data'}
    });
    if (typeof ops.host !== 'undefined') { host = ops.host; }
    symbolsToTest = ops.symbol;

    // create IoC interface object
    Hybrix = require('../dist/hybrix-lib.nodejs.js');
    hybrix = new Hybrix.Interface({http: require('http')});
    DEBUG = ops.debug;
    renderTable = renderTableCLI;
  } else {
    symbolsToTest = getParameterByName('symbol');

    hybrix = new Hybrix.Interface({XMLHttpRequest: XMLHttpRequest});
    DEBUG = getParameterByName('debug') === 'true';
    if (getParameterByName('host')) { host = getParameterByName('debug'); }

    renderTable = renderTableWeb;
    progressCallback = progress => {
      document.body.innerHTML = '<div style="border-style:solid; border-width:1px; border-radius:10px; height:20px;"><div style="text-align:center;color:white;background-color:blue; border-radius:10px; height:20px; width:' + (progress * 100) + '%">' + Math.floor(progress * 100) + '%</div></div>';
    };
  }

  let tests = {};
  if (symbolsToTest) {
    symbolsToTest = symbolsToTest.split(',');
    for (let i = 0; i < symbolsToTest.length; ++i) {
      tests[symbolsToTest[i]] = testAsset(symbolsToTest[i]);
    }
  } else {
    tests = {
      dummy: testAsset('dummy'),
      eth: testAsset('eth'),
      ark: testAsset('ark'),
      btc: testAsset('btc'),
      burst: testAsset('burst'),
      dash: testAsset('dash'),
      dgb: testAsset('dgb'),
      etc: testAsset('etc'),
      exp: testAsset('exp'),
      lsk: testAsset('lsk'),
      ltc: testAsset('ltc'),
      nxt: testAsset('nxt'),
      omni: testAsset('omni'),
      rise: testAsset('rise'),
      shift: testAsset('shift'),
      ubq: testAsset('ubq'),
      waves: testAsset('waves'),
      xcp: testAsset('xcp'),
      xem: testAsset('xem'),
      xrp: testAsset('xrp'),
      zec: testAsset('zec')
      // bts: testAsset('bts'), -> FAUCET, ETC!
      // bch: testAsset('bch'), -> ADD SEGWIT
      // xel: testAsset('xel'), //-> HOST issues
    };
  }

  hybrix.sequential(
    [
      'init',
      {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'session',
      {host: host}, 'addHost',

      tests,
      'parallel'

    ]
    , renderTable
    , (error) => { console.error(error); }
    , progressCallback

  );
}

/*
 *  Test if browser or nodejs and run go()
 */

if (typeof window === 'undefined') {
  go('node');
}
