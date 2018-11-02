nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('../dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('http')});

hybridd.sequential([
  'init',
  {host: 'http://localhost:1111/'}, 'addHost',
//  {query:'/e/storage/set/r/g'} ,'rout'
  {key:'kersen', value:{a:"b"}, encrypted:false, work:true}, 'save',
]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
  , (progress) => { console.log(progress); }
);
