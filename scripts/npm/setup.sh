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

if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ]; then
    SYSTEM="x86"
elif [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="x86_64"
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
    exit 1;
fi



# NODE
if [ ! -e "$INTERFACE/node_binaries" ];then

    echo " [!] interface/node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIDD"
        echo " [i] Clone node js runtimes files"
        git clone https://www.gitlab.com/iochq/hybridd/dependencies/nodejs.git
    fi
    echo " [i] Link NODEJS files"
    ln -sf "$NODEJS/$SYSTEM" "$INTERFACE/node_binaries"
fi
export PATH="$INTERFACE/node_binaries/bin:$PATH"


# COMMON
if [ ! -e "$INTERFACE/common" ];then

    echo " [!] interface/common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIDD"
        echo " [i] Clone common files"
        git clone https://www.gitlab.com/iochq/hybridd/common.git
    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$INTERFACE/common"

fi

# Generate API documentation
if [ "$INTERFACE/docs/interface.js.html" -ot "$INTERFACE/lib/interface.js" ]; then
  echo "[.] Generate hybridd.Interface documentation."
  mkdir -p "$INTERFACE/docs"
  jsdoc "$INTERFACE/lib/interface.js" -t "$INTERFACE/jsdoc-template" -d "$INTERFACE/docs"
else
  echo "[.] hybridd.Interface documentation already up to date."
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"
