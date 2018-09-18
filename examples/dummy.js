nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('../dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('https')});

hybridd.sequential([
  'init',
    {username: '***', password: '***'}, 'session',
  {host: 'http://localhost:1111/'}, 'addHost',

  {key:"appel",value:"taart",encrypted:true}, 'save'
//  {symbol: 'dummy', amount: 100, channel: 'y'}, 'rawTransaction'
]
  , (data) => { console.log(JSON.stringify(data)); }
  , (error) => { console.error(error); }
  , (progress) => { console.log(progress); }
);
