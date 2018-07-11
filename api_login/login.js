function go () {
  function init (callback) {
    ioc.login('POMEW4B5XACN3ZCX', 'TVZS7LODA5CSGP6U');
    ioc.addHost('http://localhost:1111/', () => {
      // ioc.addAsset('btc', () => { console.log('b'); });
      ioc.yCall('http://localhost:1111/', '/asset', (a) => {
        console.log('test', a);
        ioc.yCall('http://localhost:1111/', '/asset', (a) => {
          console.log('test', a);
        });
      });
    });
  }

  var ioc = new IoC();

  ioc.init(init);
}
