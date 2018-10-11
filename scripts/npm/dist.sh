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

echo "[.] Copy interface distributables to node."
mkdir -p "$NODE/interface"
rsync -aK "$INTERFACE/dist/" "$NODE/interface/"


export PATH="$OLDPATH"
cd "$WHEREAMI"
