function go () {
  function hybriddCall (host, query, callback) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = e => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        var responseObject = JSON.parse(xhr.responseText);// JSON.parse
        if (responseObject.hasOwnProperty('id') && responseObject.id === 'id') {
          setTimeout(() => {
            xhr.open('GET', 'http://localhost:1111/p/' + responseObject.data, true);
            xhr.send();
          }, 1000); // TODO fix ugly timeout
        } else {
          callback(responseObject);
        }
      }
    };

    xhr.open('GET', host + query, true);
    xhr.send();
  }

  function init (callback) {
    var assetDetails = {'fee': '0.00100000', 'factor': '8', 'contract': 'undefined', 'symbol': 'waves', 'name': 'Waves', 'mode': 'waves', 'unified-symbols': 'undefined', 'fee-symbol': 'waves', 'keygen-base': 'waves', 'generated': 'never'};

    // {"fee":"0.00002500","factor":"8","contract":"Not yet implemented!","symbol":"btc","name":"Bitcoin","mode":"bitcoinjslib.bitcoin","unified-symbols":"undefined","fee-symbol":"btc","keygen-base":"btc","generated":"never"};

    ioc.login('POMEW4B5XACN3ZCX', 'TVZS7LODA5CSGP6U');

    var query = 's/deterministic/code/' + assetDetails.mode.split('.')[0];

    hybriddCall('http://localhost:1111/', query, (response) => {
      ioc.initAsset(assetDetails, response.data);
      console.log(ioc.getAddress(assetDetails.symbol));

      hybriddCall('http://localhost:1111/', ioc.xAuthStep0Request(), (response) => {
        var nonce1 = response.nonce1;

        hybriddCall('http://localhost:1111/', ioc.xAuthStep1Request(nonce1), (response) => {
          ioc.xAuthFinalize(response);
          console.log('Successfully created a session!');
        });
      });
    });
  }

  var ioc = new IoC();

  ioc.init(init);
}
