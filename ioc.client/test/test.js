/* TODO

*/

function go () {
  var ioc = new IoC.Interface({XMLHttpRequest: XMLHttpRequest});
  ioc.sequential([
    'init',
    {username: 'POMEW4B5XACN3ZCX', password: 'TVZS7LODA5CSGP6U'}, 'login',
    {host: 'http://localhost:1111/'}, 'addHost',
    {symbol: 'dummy', amount: 100, channel: 'y'}, 'transaction',
    {
      sample: {data: {query: '/asset/dummy/sample'}, step: 'call'},
      details: {data: {query: '/asset/dummy/details'}, step: 'call'},
      status: {data: {query: '/asset/dummy/status'}, step: 'call'}
    },
    'parallel'

    /*

- - Validate sample address
- - check unspents for sample address
- - check balance for sample address
- - check history for sample address
- - check transaction info for sample transaction
      */
  ]
    , (data) => { console.log('Succes', data); }
    , (error) => { console.error(error); }
  );
}
