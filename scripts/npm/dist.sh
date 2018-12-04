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

echo "[.] Copy interface distributables to node."
mkdir -p "$NODE/interface"
rsync -aK "$INTERFACE/dist/" "$NODE/interface/"


export PATH="$OLDPATH"
cd "$WHEREAMI"
