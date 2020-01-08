const knownIssues = require('./knownIssues.js').knownIssues;
const valid = require('./valid.js');
const DEFAULT_AMOUNT = 0.00001;

const DEFAULT_TEST_SYMBOLS = [
  'bch',
  'dummy',
  'eth',
  'flo',
  'ark',
  'btc',
  'burst',
  'dash',
  'dgb',
  'etc',
  'exp',
  'lsk',
  'ltc',
  'nxt',
  'omni',
  'rise',
  'shift',
  'ubq',
  'waves',
  'xcp',
  'xem',
  'xrp',
  'zec',
  'mock.btc',
  'eth.xhy',
  'waves.xhy',
  'nxt.xhy',
  'omni.xhy',
  'xcp.xhy',
  'xem.xhy'
  // 'bts' -> FAUCET, ETC!
  // 'xel' -> HOST issues
];

const testCases = result => {
  return {
    test: {data: result.test, step: 'id'},
    sample: {data: result.sample, step: 'id'},
    details: {data: result.details, step: 'id'},
    sampleValid: {data: result.sampleValid, step: 'id'},
    sampleBalance: {data: result.sampleBalance, step: 'id'},
    sampleUnspent: {data: result.sampleUnspent, step: 'id'},
    sampleHistory: {data: result.sampleHistory, step: 'id'},
    sampleTransaction: {data: result.sampleTransaction, step: 'id'},

    seedValid: {data: result.seedValid, step: 'id'},
    seedBalance: {data: result.seedBalance, step: 'id'},
    seedUnspent: {data: result.seedUnspent, step: 'id'},
    seedSign: {data: result.seedSign, step: 'id'},
    seedSignHash: {data: {data: result.seedSign}, step: 'hash'}
    // seedHistory: {data: result.seedHistory, step: 'id'},
  };
};

const testIds = Object.keys(testCases({}));

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
      if (typeof result.sample === 'undefined') { result.sample = {}; }
      if (typeof result.details === 'undefined') { result.details = {}; }
      if (typeof result.test === 'undefined') { result.test = {}; }
      return {
        sample: {data: result.sample, step: 'id'},
        test: {data: result.test, step: 'id'},
        details: {data: result.details, step: 'id'},
        address: {data: result.address, step: 'id'},

        sampleValid: {data: {query: '/asset/' + symbol + '/validate/' + result.sample.address}, step: 'rout'},
        sampleBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.sample.address}, step: 'rout'},
        sampleUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.sample.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.address + '/' + result.sample.publicKey}, step: 'rout'},
        sampleHistory: {data: {query: '/asset/' + symbol + '/history/' + result.sample.address}, step: 'rout'},
        sampleTransaction: {data: {query: '/asset/' + symbol + '/transaction/' + result.sample.transaction}, step: 'rout'},

        seedValid: {data: {query: '/asset/' + symbol + '/validate/' + result.address}, step: 'rout'},
        seedBalance: {data: {query: '/asset/' + symbol + '/balance/' + result.address}, step: 'rout'},
        seedUnspent: {data: {query: '/asset/' + symbol + '/unspent/' + result.address + '/' + (Number(DEFAULT_AMOUNT) + Number(result.details.fee)) + '/' + result.sample.address + '/' + result.publicKey}, step: 'rout'}
        // seedHistory: {data: {query: '/asset/' + symbol + '/history/' + result.address}, step: 'rout'}
      };
    },
    'parallel',
    result => {
      return {
        test: {data: result.test, step: 'id'},
        sample: {data: result.sample, step: 'id'},
        details: {data: result.details, step: 'id'},
        sampleValid: {data: result.sampleValid + ' ' + result.sample.address, step: 'id'},
        sampleBalance: {data: result.sampleBalance, step: 'id'},
        sampleUnspent: {data: result.sampleUnspent, step: 'id'},
        sampleHistory: {data: result.sampleHistory, step: 'id'},
        sampleTransaction: {data: result.sampleTransaction, step: 'id'},

        seedValid: {data: result.seedValid + ' ' + result.address, step: 'id'},
        seedBalance: {data: result.seedBalance, step: 'id'},
        seedUnspent: {data: result.seedUnspent, step: 'id'},
        seedSign: {data: {symbol: symbol, amount: DEFAULT_AMOUNT, target: result.sample.address, validate: false, unspent: result.test.hasOwnProperty('unspent') ? result.test.unspent : result.seedUnspent, time: result.test.time}, step: 'rawTransaction'}
        // seedHistory: {data: result.seedHistory, step: 'id'},
      };
    },
    'parallel',
    testCases,
    'parallel'
  ],
  step: 'sequential'
  };
}

const validate = (symbols) => results => {
  const assets = {};
  let total = 0;
  let failures = 0;
  for (let symbol in results) {
    assets[symbol] = {};
    if (symbols.includes(symbol)) {
      const details = results[symbol].details;
      const test = results[symbol].test;

      for (let testId in results[symbol]) {
        const result = results[symbol][testId];
        if (valid.hasOwnProperty(testId)) {
          const isValid = valid[testId](results[symbol][testId], details, test);
          let known;
          if (!isValid) {
            ++failures;
            known = knownIssues[symbol + '_' + testId];
          }
          assets[symbol][testId] = {valid: isValid, known, result, messages: ['TODO']};
        } else {
          const known = knownIssues[symbol + '_' + testId];
          assets[symbol][testId] = {valid: false, known, result, messages: ['No validation available']};
          ++failures;
        }
        ++total;
      }
    } else {
      for (let testId of testIds) {
        const known = knownIssues[symbol + '_' + testId];
        assets[symbol][testId] = {valid: false, known, result: null, messages: ['Asset not available']};
        ++total;
        ++failures;
      }
    }
  }

  const data = {assets: {}, total, failures};
  Object.keys(assets).sort().forEach((key) => {
    data.assets[key] = assets[key];
  });
  return data;
};

function runTests (symbols, hybrix, host, dataCallback, progressCallback) {
  const tests = {};
  if (symbols && symbols !== '*') {
    symbols = symbols.split(',');
  } else {
    symbols = DEFAULT_TEST_SYMBOLS;
  }
  for (let symbol of symbols) {
    tests[symbol] = testAsset(symbol);
  }

  hybrix.sequential(
    [
      'init',
      {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'session',
      {host: host}, 'addHost',
      tests,
      'parallel',
      validate(symbols)
    ]
    , dataCallback
    , error => { console.error(error); }
    , progressCallback
  );
}

exports.runTests = runTests;
