#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
NODEINST=`which node`

# $HYBRIXD/interface/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIXD/node"
DETERMINISTIC="$HYBRIXD/deterministic"
NODEJS="$HYBRIXD/nodejs"
COMMON="$HYBRIXD/common"
WEB_WALLET="$HYBRIXD/web-wallet"
ENVIRONMENT="$1"

if [ "$ENVIRONMENT" = "dev" ]; then
    URL_COMMON="https://gitlab.com/hybrix/hybrixd/common.git"
    URL_NODEJS="https://www.gitlab.com/hybrix/hybrixd/dependencies/nodejs.git"
    INTERFACE="$HYBRIXD/interface"
    echo "[i] Environment is development..."
elif [ "$ENVIRONMENT" = "public" ]; then
    URL_COMMON="https://github.com/hybrix-io/common.git"
    URL_NODEJS="https://github.com/hybrix-io/nodejs.git"
    INTERFACE="$HYBRIXD/hybrix-jslib"
    echo "[i] Environment is public..."
else
    echo "[!] Unknown Environment (please use npm run setup[:dev])"
    export PATH="$OLDPATH"
    cd "$WHEREAMI"
    exit 1
fi

if [ "`uname`" = "Darwin" ]; then
    SYSTEM="darwin-x64"
elif [ "`uname -m`" = "i386" ] || [ "`uname -m`" = "i686" ]; then
    SYSTEM="x86"
elif [ "`uname -m`" = "x86_64" ]; then
    SYSTEM="x86_64"
else
    echo "[!] Unknown Architecture (or incomplete implementation)"
#    exit 1;
fi

# NODE
if [ ! -e "$INTERFACE/node_binaries" ];then

    echo " [!] node_binaries not found."

    if [ ! -e "$NODEJS" ];then
        cd "$HYBRIXD"
        echo " [i] Clone node js runtimes files"
        git clone "$URL_NODEJS"
    fi
    echo " [i] Link NODEJS files"
    ln -sf "$NODEJS/$SYSTEM" "$INTERFACE/node_binaries"
fi
export PATH="$INTERFACE/node_binaries/bin:$PATH"


# COMMON
if [ ! -e "$INTERFACE/common" ];then

    echo " [!] common not found."

    if [ ! -e "$COMMON" ];then
        cd "$HYBRIXD"
        echo " [i] Clone common files"
        git clone "$URL_COMMON"

    fi
    echo " [i] Link common files"
    ln -sf "$COMMON" "$INTERFACE/common"

fi

if [ -e "$HYBRIXD/project-xhy" ]; then
    ln -sf "$HYBRIXD/project-xhy" "$INTERFACE/lib/methods/rawTransaction/project-xhy"
fi

# GIT HOOKS
sh "$COMMON/hooks/hooks.sh" "$INTERFACE"

export PATH="$OLDPATH"
cd "$WHEREAMI"
