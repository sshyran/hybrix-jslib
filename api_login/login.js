function go () {
  function init (callback) {
    ioc.login('POMEW4B5XACN3ZCX', 'TVZS7LODA5CSGP6U');
    ioc.addHost('http://localhost:1111/', () => {
      // ioc.addAsset('btc', () => { console.log('b'); });
      ioc.call('http://localhost:1111/', '/asset', (a) => {
        console.log('test', a);
        ioc.call('http://localhost:1111/', '/asset', (a) => {
          console.log('test', a);
        }, null, {channel: 'z'});
      }, null, {channel: 'y'});
    });
  }

  var ioc = new IoC();

  ioc.init(init);
}
