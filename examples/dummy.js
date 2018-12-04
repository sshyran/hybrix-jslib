nacl_factory = require('../common/crypto/nacl.js');

var hybrixd = require('../dist/hybrixd.interface.nodejs.js');
var hybrixd = new hybrixd.Interface({http: require('http')});

hybrixd.sequential([
  'init',
  {host: 'http://localhost:1111/'}, 'addHost',
//  {query:'/e/storage/set/r/g'} ,'rout'
  {key:'kersen', value:{a:"b"}, encrypted:false, work:true}, 'save',
]
  , (data) => { console.log(data); }
  , (error) => { console.error(error); }
  , (progress) => { console.log(progress); }
);
