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

# Generate API documentation
if [ "$INTERFACE/docs/interface.js.html" -ot "$INTERFACE/lib/interface.js" ]; then
  echo "[.] Generate hybridd.Interface documentation."
  mkdir -p "$INTERFACE/docs"
  jsdoc "$INTERFACE/lib/interface.js" -t "$INTERFACE/jsdoc-template" -d "$INTERFACE/docs"
else
  echo "[.] hybridd.Interface documentation already up to date."
fi

# Generate libary that can be imported into Node projects
$INTERFACE/node_modules/webpack/bin/webpack.js --config "$INTERFACE/conf/webpack.config.hybridd.interface.nodejs.js"

# Generate libary that can be imported into html pages
$INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/common/crypto/nacl.js" > "$INTERFACE/dist/hybridd.interface.nacl.js.tmp"

$INTERFACE/node_modules/webpack/bin/webpack.js -p --config "$INTERFACE/conf/webpack.config.hybridd.interface.web.js"
$INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/dist/hybridd.interface.web.js.tmp" > "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"

# fuse the packed files together
cat "$INTERFACE/dist/hybridd.interface.nacl.js.tmp" "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"  > "$INTERFACE/dist/hybridd.interface.web.js"

# clean up
rm "$INTERFACE/dist/hybridd.interface.nacl.js.tmp"
rm "$INTERFACE/dist/hybridd.interface.web.js.tmp"
rm "$INTERFACE/dist/hybridd.interface.web.js.min.tmp"


export PATH="$OLDPATH"
cd "$WHEREAMI"
