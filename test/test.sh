#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
SCRIPTDIR="`dirname \"$0\"`"
RUN="`cd \"$SCRIPTDIR\" && pwd`"
export PATH="$RUN/../node_binaries/bin:$PATH"
NODEINST=`which node`

echo " [i] using node executable $NODEINST"
node "$RUN/lib/cli.js" $@

export PATH="$OLDPATH"
cd "$WHEREAMI"
