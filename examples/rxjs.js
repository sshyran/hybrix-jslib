nacl_factory = require('../common/crypto/nacl.js');

var Hybridd = require('../dist/hybridd.interface.nodejs.js');
var hybridd = new Hybridd.Interface({http: require('http')});

R = require('./rxjs/rx.min');


function createHybriddObservable(id, data) {
  var o = R.Observable.create(function(observer) {
    hybridd[id](data, data => observer.next(data), error => observer.error(error));
  });
  return o;
}

/**
 * Converts a callback function to an observable sequence.
 *
 * @param {String} id The name of the interface function
 * @returns {Function} A function, when executed with the required input data, produces an Observable
 */
fromHybriddCallback = function (id) {
  return function (data) {
    return createHybriddObservable (id, data);
  };
};


DEBUG=true;
const init = fromHybriddCallback('init');
const session = fromHybriddCallback('session');
const host = fromHybriddCallback('addHost');

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
