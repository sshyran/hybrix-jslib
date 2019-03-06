#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
NODEINST=`which node`

# $HYBRIXD/interface/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIXD/interface"
NODE="$HYBRIXD/node"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs-v8-lts"
COMMON="$HYBRIXD/common"
WEB_WALLET="$HYBRIXD/web-wallet"

export PATH="$INTERFACE/node_binaries/bin:$PATH"


# Add nacl to nodejs version
echo "var nacl_factory = require('../common/crypto/nacl.js');" > "$INTERFACE/lib/interface.nodejs.js.tmp"
cat "$INTERFACE/lib/interface.js" >> "$INTERFACE/lib/interface.nodejs.js.tmp"

if [ "$1" = "debug" ] || [ "$1" = "development" ]; then
  echo "development mode, don't uglify";
  $INTERFACE/node_modules/webpack/bin/webpack.js --config "$INTERFACE/conf/webpack.config.hybrixd.interface.nodejs.js" --mode development
  cat "$INTERFACE/common/crypto/nacl.js" > "$INTERFACE/dist/hybrixd.interface.nacl.js.tmp"
  $INTERFACE/node_modules/webpack/bin/webpack.js -p --config "$INTERFACE/conf/webpack.config.hybrixd.interface.web.js" --mode development
  cat "$INTERFACE/dist/hybrixd.interface.web.js.tmp" > "$INTERFACE/dist/hybrixd.interface.web.js.min.tmp"
else
  echo "uglify";
  $INTERFACE/node_modules/webpack/bin/webpack.js --config "$INTERFACE/conf/webpack.config.hybrixd.interface.nodejs.js" --mode production
  $INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/common/crypto/nacl.js" > "$INTERFACE/dist/hybrixd.interface.nacl.js.tmp"
  $INTERFACE/node_modules/webpack/bin/webpack.js -p --config "$INTERFACE/conf/webpack.config.hybrixd.interface.web.js" --mode production
  $INTERFACE/node_modules/uglify-es/bin/uglifyjs "$INTERFACE/dist/hybrixd.interface.web.js.tmp" > "$INTERFACE/dist/hybrixd.interface.web.js.min.tmp"
fi

# fuse the packed files together (with license information)
cat "$INTERFACE/LICENSE-pack.md" "$INTERFACE/dist/hybrixd.interface.nacl.js.tmp" "$INTERFACE/dist/hybrixd.interface.web.js.min.tmp"  > "$INTERFACE/dist/hybrix-lib.web.js"

# fuse the license to nodejs version of interface
cat "$INTERFACE/LICENSE-pack.md" "$INTERFACE/dist/hybrix-lib.nodejs.js" > "$INTERFACE/dist/hybrix-lib.nodejs.js.tmp"
mv "$INTERFACE/dist/hybrix-lib.nodejs.js.tmp" "$INTERFACE/dist/hybrix-lib.nodejs.js"

# clean up
rm "$INTERFACE/lib/interface.nodejs.js.tmp"
rm "$INTERFACE/dist/hybrixd.interface.nacl.js.tmp"
rm "$INTERFACE/dist/hybrixd.interface.web.js.tmp"
rm "$INTERFACE/dist/hybrixd.interface.web.js.min.tmp"


export PATH="$OLDPATH"
cd "$WHEREAMI"
