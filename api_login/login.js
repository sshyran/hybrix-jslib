/* TODO

*/

function go () {
  var ioc = new IoC();

  ioc.sequential([
    'init',
    'do',
    {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
    {host: 'http://localhost:1111/'}, 'addHost',
    {symbol: 'dummy'}, 'addAsset',
    {symbol: 'dummy', amount: 100}, 'transaction'
  ]
    , () => { console.log('Succes'); }
    , (error) => { console.error(error); }
  );
}
