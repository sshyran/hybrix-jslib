#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
NODEINST=`which node`

# $HYBRIDD/interface/scripts/npm  => $HYBRIDD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIDD/interface"
NODE="$HYBRIDD/node"
DETERMINISTIC="$HYBRIDD/deterministic"
NODEJS="$HYBRIDD/nodejs-v8-lts"
COMMON="$HYBRIDD/common"
WEB_WALLET="$HYBRIDD/web-wallet"

export PATH="$INTERFACE/node_binaries/bin:$PATH"

if [ "$1" = "debug" ] || [ "$1" = "development" ]; then
  echo "development mode, don't uglify";
  $INTERFACE/node_modules/webpack/bin/webpack.js --config "$INTERFACE/conf/webpack.config.hybridd.interface.nodejs.js" --mode development
  cat "$INTERFACE/common/crypto/nacl.js" > "$INTERFACE/dist/hybridd.interface.nacl.js.tmp"
  $INTERFACE/node_modules/webpack/bin/webpack.js -p --config "$INTERFACE/conf/webpack.config.hybridd.interface.web.js"
  cat "$INTERFACE/dist/hybridd.interface.web.js.tmp" > "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"
else
  echo "uglify";
  $INTERFACE/node_modules/webpack/bin/webpack.js --config "$INTERFACE/conf/webpack.config.hybridd.interface.nodejs.js" --mode production
  $INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/common/crypto/nacl.js" > "$INTERFACE/dist/hybridd.interface.nacl.js.tmp"
  $INTERFACE/node_modules/webpack/bin/webpack.js -p --config "$INTERFACE/conf/webpack.config.hybridd.interface.web.js"
  $INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/dist/hybridd.interface.web.js.tmp" > "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"
fi

# fuse the packed files together
cat "$INTERFACE/dist/hybridd.interface.nacl.js.tmp" "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"  > "$INTERFACE/dist/hybridd.interface.web.js"

# clean up
rm "$INTERFACE/dist/hybridd.interface.nacl.js.tmp"
rm "$INTERFACE/dist/hybridd.interface.web.js.tmp"
rm "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"


export PATH="$OLDPATH"
cd "$WHEREAMI"