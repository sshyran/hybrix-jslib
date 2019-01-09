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
NODEJS="$HYBRIXD/nodejs"
COMMON="$HYBRIXD/common"
WEB_WALLET="$HYBRIXD/web-wallet"

cd "$INTERFACE"
SOURCE_FILES="common lib"

if [ "`uname`" = "Darwin" ]; then
    NEWEST_SOURCE_FILE=$(find $SOURCE_FILES -type f -print0 | xargs -0 stat -f "%m %N" | sort -rn | head -1 | cut -f2- -d" ")
    NEWEST_DIST_FILE=$(find dist -type f -print0 | xargs -0 stat -f "%m %N" | sort -rn | head -1 | cut -f2- -d" ")
    SOURCE_TIME=$(stat -f "%m" "$NEWEST_SOURCE_FILE")
    DIST_TIME=$(stat -f "%m" "$NEWEST_DIST_FILE")
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ] || [ "`uname -m`" = "x86_64" ]; then
    NEWEST_SOURCE_FILE=$(find $SOURCE_FILES -type f -exec stat --format '%Y :%y %n' "{}" \; | sort -nr | cut -d: -f2- | head)
    NEWEST_DIST_FILE=$(find dist -type f -exec stat --format '%Y :%y %n' "{}" \; | sort -nr | cut -d: -f2- | head)
    SOURCE_TIME=$(stat -c "%Y" "$NEWEST_SOURCE_FILE")
    DIST_TIME=$(stat -c "%Y" "$NEWEST_DIST_FILE")
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
    exit 1;
fi

if [ "$SOURCE_TIME" -gt "$DIST_TIME" ]; then
 echo "NOT UP TO DATE";
else
 echo "UP TO DATE";
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"
