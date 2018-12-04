nacl_factory = require('../common/crypto/nacl.js');

var hybrixd = require('../dist/hybrixd.interface.nodejs.js');
var hybrixd = new hybrixd.Interface({http: require('http')});

R = require('./rxjs/rx.min');


function createhybrixdObservable(id, data) {
  var o = R.Observable.create(function(observer) {
    hybrixd[id](data, data => observer.next(data), error => observer.error(error));
  });
  return o;
}

/**
 * Converts a callback function to an observable sequence.
 *
 * @param {String} id The name of the interface function
 * @returns {Function} A function, when executed with the required input data, produces an Observable
 */
fromhybrixdCallback = function (id) {
  return function (data) {
    return createhybrixdObservable (id, data);
  };
};


DEBUG=true;
const init = fromhybrixdCallback('init');
const session = fromhybrixdCallback('session');
const host = fromhybrixdCallback('addHost');

//var stream = session({username:'***',password:'**'});
//const subscribe = stream.subscribe(val => console.log(val));
for(var k in init()){
//  console.log(k);
}
//_ => host({host:'http://localhost:1111'})

init()
  .pipe( R.operators.flatMap(_ => session({username:'POMEW4B5XACN3ZCX',password:'TVZS7LODA5CSGP6U'})),
         R.operators.flatMap( _ => host({host:'http://localhost:1111'})    )
       )
  .subscribe(x => console.log(x))


/*
.pipe(
  R.operators.flatMap(_ => {
    console.log("a");
    return
  })
)
  */
