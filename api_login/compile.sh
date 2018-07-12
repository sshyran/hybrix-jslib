#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/../../../node/bin:"$PATH"
NODEINST=`which node`

jsdoc interface.js

cat  ../index.js ../ychan.js ../zchan.js ../crypto/hex2dec.js ../crypto/decimal-light.js ../crypto/nacl.js ../crypto/sjcl.js ../crypto/lz-string.js ../crypto/urlbase64.js hybriddNode.js interface.js  > compiled.js

#TODO minify uglify

PATH=$OLDPATH
