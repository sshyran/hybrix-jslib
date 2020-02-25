const knownIssues = {};
const nodeRepo = 'https://gitlab.com/hybrix/hybrixd/node/issues/';
const issueData = [
  ['bch_seedSign', 'Not yet functioning. Perhaps funds missing for test', '1033'],
  ['bch_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1034'],
  ['bch_sampleBalance', 'returned undefined', '995'],
  ['bch_sampleHistory', 'returned undefined', '996'],
  ['bch_sampleTransaction', 'returned undefined', '997'],
  ['bch_sampleUnspent', 'returned undefined', '998'],
  ['bch_seedBalance', 'returned undefined', '1016'],
  ['bch_seedUnspent', 'returned undefined', '999'],
  ['bch_sampleValid', 'returned undefined', '1026'],

  ['btc_seedSignHash', 'Signing still holds a dynamic componement', '1035'],

  ['burst_seedUnspent', 'Not yet functioning. Perhaps funds missing for test', '1038'],
  ['burst_seedSign', 'Not yet functioning. Perhaps funds missing for test', '1036'],
  ['burst_seedSignHash', 'Not yet functioning. Perhaps funds missing for test / Signing still holds a dynamic componement', '1037'],

  ['dash_seedSign', 'Unstable host. Should work', '1039'],
  ['dash_seedSignHash', 'Unstable host. Should work', '1040'],
  ['dash_seedBalance', 'returned undefined', '1018'],
  ['dash_seedUnspent', 'returned undefined', '1022'],
  ['dash_sampleTransaction', 'Malfunction', ''],
  ['dash_sampleHistory', 'Unstable host. Should work', '1060'],
  ['dash_sampleBalance', 'returned undefined', '1021'],
  ['dash_sampleUnspent', 'returned undefined', '1025'],

  ['dgb_sampleHistory', 'Not yet functioning', '1041'],
  ['dgb_seedSign', 'Not yet functioning. Perhaps funds missing for test', '1042'],
  ['dgb_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1043'],
  ['dgb_sampleUnspent', 'returned undefined', '1000'],
  ['dgb_seedUnspent', 'returned undefined', '1001'],

  ['etc_sampleHistory', 'Not yet functioning', '1023'],
  ['etc_sampleBalance', 'Not yet functioning', '1024'],
  ['etc_seedBalance', 'returned undefined', '699'],

  ['eth.xhy_sampleHistory', 'Eth token history not yet supported', '701'],
  ['eth.xhy_sampleBalance', 'returned undefined', '1002'],
  ['eth.xhy_seedBalance', 'returned undefined', '1003'],

  ['exp_sampleHistory', 'Not yet functioning', '1044'],
  ['exp_seedSignHash', 'returned 49AFC302', '1004'],

  ['flo_seedSign', 'Not yet functioning. Perhaps funds missing for test', '1045'],
  ['flo_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1046'],
  ['flo_seedUnspent', 'returned undefined', '1005'],
  ['flo_sampleTransaction', 'returned undefined', '1056'],

  ['ltc_sampleHistory', 'returned undefined', '1006'],
  ['ltc_sampleBalance', 'returned undefined', '1057'],
  ['ltc_sampleUnspent', 'returned undefined', '1058'],
  ['ltc_seedBalance', 'returned undefined', '1027'],
  ['ltc_seedSign', 'returned undefined', '1028'],
  ['ltc_seedSignHash', 'returned undefined', '1029'],
  ['ltc_seedUnspent', 'returned undefined', '1030'],
  ['ltc_sampleTransaction', 'Not yet functioning', '1061'],

  ['mock.btc_sampleTransaction', 'returned unknown transaction2', '1007'],

  ['nxt_seedSignHash', 'Signing still holds a dynamic componement', ''],
  ['nxt_sampleHistory', 'returned valid', '1017'],
  ['nxt.xhy_seedSignHash', 'Signing still holds a dynamic componement', ''],
  ['nxt.xhy_seedSign', 'returned null', '1008'],

  ['omni_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1047'],
  ['omni_sampleHistory', 'returned math calculation error', '1009'],
  ['omni.xhy_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1048'],
  ['omni.xhy_sampleHistory', 'returned math calculation error', '1010'],

  ['ubq_sampleHistory', 'Not yet functioning', '697'],
  ['ubq_seedSignHash', 'returned 1149D33D', '1011'],

  ['rise_sampleTransaction', 'Not yet functioning', '885'],
  ['rise_sampleHistory', 'returned undefined', '1059'],

  ['shift_sampleTransaction', 'Not yet functioning', '885'],

  ['xcp_seedSignHash', 'Signing still holds a dynamic componement', '1049'],
  ['xcp_sampleTransaction', 'Missing data for source,dest,amount, fee', '705'],
  ['xcp_sampleHistory', 'returned undefined', '1019'],
  ['xcp.xhy_sampleTransaction', 'Missing data for source,dest,amount, fee', '705'],
  ['xcp.xhy_sampleHistory', 'returned undefined', '1054'],
  ['xcp.xhy_sampleBalance', 'returned undefined', '1055'],
  ['xcp.xhy_seedSignHash', 'Signing still holds a dynamic componement', '1050'],

  ['xem_sampleHistory', 'returned undefined', '1012'],
  ['xem.xhy_sampleHistory', 'returned undefined', '1013'],

  ['xrp_seedSignHash', 'Signing still holds a dynamic componement', '1051'],
  ['xrp_sampleHistory', 'returned undefined', '1014'],

  ['zec_seedSign', 'Not yet functioning. Perhaps funds missing for test', '1052'],
  ['zec_seedSignHash', 'Not yet functioning. Perhaps funds missing for test', '1053'],
  ['zec_sampleHistory', 'Unstable', '702']
];

issueData.map(makeKnownIssues);

function makeKnownIssues (data) {
  knownIssues[data[0]] = {
    message: data[1],
    link: data[2] === '' ? '' : nodeRepo + data[2]
  };
}

exports.knownIssues = knownIssues;
