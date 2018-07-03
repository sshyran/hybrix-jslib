#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/../../../node/bin:"$PATH"
NODEINST=`which node`

cat nacl.js sjcl.js lz-string.js urlbase64.js interface.js  > deterministic.js.lzma

#| ../../../node_modules/uglify-js/bin/uglifyjs
#./lzmapack.js compiled.js
#rm compiled.js
#mv compiled.js.lzma iocconnector.js.lzma

PATH=$OLDPATH
