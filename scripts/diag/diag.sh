#!/bin/sh
OLDPATH="$PATH"
WHEREAMI="`pwd`"
export PATH="$WHEREAMI/node_binaries/bin:$PATH"
NODEINST="`which node`"
UGLIFY=node_modules/uglify-es/bin/uglifyjs
CSSMIN=node_modules/cssmin/bin/cssmin

# $HYBRIDD/node/scripts/npm  => $HYBRIDD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIDD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

NODE="$HYBRIDD/node"

echo "SCRIPTDIR: "$SCRIPTDIR


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

GREEN="\033[0;32m"
RED="\033[0;31m"
RESET="\033[0m"

checkGit(){
    branch_name=$(git symbolic-ref -q HEAD)
    branch_name=${branch_name##refs/heads/}
    branch_name=${branch_name:-HEAD}
    echo " [.] Current branch: $branch_name"

    git remote update > /dev/null
    UPSTREAM=${1:-'@{u}'}
    LOCAL=$(git rev-parse @{u})
    REMOTE=$(git rev-parse "$UPSTREAM")
    BASE=$(git merge-base @{u} "$UPSTREAM")

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "  [.] Up-to-date"
    elif [ "$LOCAL" = "$BASE" ]; then
        echo "$RED  [.] Need to pull$RESET"
    elif [ "$REMOTE" = "$BASE" ]; then
        echo "$GREEN  [.] Need to push$RESET"
    else
        echo "$RED  [.] Diverged$RESET"
    fi
}


echo "[.] Validate hybridd/node."
if [ -d "$HYBRIDD/node" ]; then
    echo " [.] hybridd/node found."

    if [ -L "$HYBRIDD/node/common" ]; then
        echo " [.] hybridd/node/common found."
        if [ "$(readlink $HYBRIDD/node/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/node/common linked correctly."
        else
            echo "$RED [!] hybridd/node/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/node/common)$RESET"
        fi
    else
        echo " [!] hybridd/node/common not linked."
    fi

    if [ -L "$HYBRIDD/node/node_binaries" ]; then
        echo " [.] hybridd/node/node_binaries found."
        if [ "$(readlink $HYBRIDD/node/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/node/node_binaries linked correctly."
        else
            echo "$RED [!] hybridd/node/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/node/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/node/node_binaries not linked.$RESET"
    fi

    #TODO interface dist
    #TODO determinstic dist
    #TODO web-wallet dist

    #TODO check if up to date


    cd "$HYBRIDD/node/"
    checkGit


else
    echo " [!] hybridd/node not found."
fi


echo "[.] Validate hybridd/web-wallet."
if [ -d "$HYBRIDD/web-wallet" ]; then
    echo " [.] hybridd/web-wallet found."

    if [ -L "$HYBRIDD/web-wallet/common" ]; then
        echo " [.] hybridd/web-wallet/common found."
        if [ "$(readlink $HYBRIDD/web-wallet/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/web-wallet/common linked correctly."
        else
            echo "$RED [!] hybridd/web-wallet/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/web-wallet/common)$RESET"
        fi
    else
        echo "$RED [!] hybridd/web-wallet/common not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/web-wallet/interface" ]; then
        echo " [.] hybridd/web-wallet/interface found."
        if [ "$(readlink $HYBRIDD/web-wallet/interface)" = "$HYBRIDD/interface/dist" ]; then
            echo " [.] hybridd/web-wallet/interface linked correctly."
        else
            echo "$RED [!] hybridd/web-wallet/interface linked incorrectly."
            echo "     Expected: $HYBRIDD/interface/dist"
            echo "     Found:    $(readlink $HYBRIDD/web-wallet/interface)$RESET"
        fi
    else
        echo "$RED [!] hybridd/web-wallet/interface not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/web-wallet/node_binaries" ]; then
        echo " [.] hybridd/web-wallet/node_binaries found."
        if [ "$(readlink $HYBRIDD/web-wallet/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/web-wallet/node_binaries linked correctly."
        else
            echo "$RED [!] hybridd/web-wallet/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/web-wallet/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/web-wallet/node_binaries not linked.$RESET"
    fi

    cd "$HYBRIDD/web-wallet/"
    checkGit
else
    echo " [.] hybridd/web-wallet not found."
fi


echo "[.] Validate hybridd/tui-wallet."
if [ -d "$HYBRIDD/tui-wallet" ]; then
    echo " [.] hybridd/tui-wallet found."

    if [ -L "$HYBRIDD/tui-wallet/common" ]; then
        echo " [.] hybridd/tui-wallet/common found."
        if [ "$(readlink $HYBRIDD/tui-wallet/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/tui-wallet/common linked correctly."
        else
            echo "$RED [!] hybridd/tui-wallet/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/tui-wallet/common)$RESET"
        fi
    else
        echo "$RED [!] hybridd/tui-wallet/common not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/tui-wallet/interface" ]; then
        echo " [.] hybridd/tui-wallet/interface found."
        if [ "$(readlink $HYBRIDD/tui-wallet/interface)" = "$HYBRIDD/interface" ]; then
            echo " [.] hybridd/tui-wallet/interface linked correctly."
        else
            echo "$RED [!] hybridd/tui-wallet/interface linked incorrectly."
            echo "     Expected: $HYBRIDD/interface"
            echo "     Found:    $(readlink $HYBRIDD/tui-wallet/interface)$RESET"
        fi
    else
        echo "$RED [!] hybridd/tui-wallet/interface not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/tui-wallet/node_binaries" ]; then
        echo " [.] hybridd/tui-wallet/node_binaries found."
        if [ "$(readlink $HYBRIDD/tui-wallet/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/tui-wallet/node_binaries linked correctly"
        else
            echo "$RED [!] hybridd/tui-wallet/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/tui-wallet/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/tui-wallet/node_binaries not linked.$RESET"
    fi

    cd "$HYBRIDD/tui-wallet/"
    checkGit

else
    echo " [.] hybridd/tui-wallet not found."
fi

echo "[.] Validate hybridd/cli-wallet."
if [ -d "$HYBRIDD/cli-wallet" ]; then
    echo " [.] hybridd/cli-wallet found."

    if [ -L "$HYBRIDD/cli-wallet/common" ]; then
        echo " [.] hybridd/cli-wallet/common found."
        if [ "$(readlink $HYBRIDD/cli-wallet/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/cli-wallet/common linked correctly."
        else
            echo "$RED [!] hybridd/cli-wallet/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/cli-wallet/common)$RESET"
        fi
    else
        echo "$RED [!] hybridd/cli-wallet/common not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/cli-wallet/interface" ]; then
        echo " [.] hybridd/cli-wallet/interface found."
        if [ "$(readlink $HYBRIDD/cli-wallet/interface)" = "$HYBRIDD/interface" ]; then
            echo " [.] hybridd/cli-wallet/interface linked correctly."
        else
            echo "$RED [!] hybridd/cli-wallet/interface linked incorrectly."
            echo "     Expected: $HYBRIDD/interface"
            echo "     Found:    $(readlink $HYBRIDD/cli-wallet/interface)$RESET"
        fi
    else
        echo "$RED [!] hybridd/cli-wallet/interface not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/cli-wallet/node_binaries" ]; then
        echo " [.] hybridd/cli-wallet/node_binaries found."
        if [ "$(readlink $HYBRIDD/cli-wallet/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/cli-wallet/node_binaries linked correctly."
        else
            echo "$RED [!] hybridd/cli-wallet/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/cli-wallet/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/cli-wallet/node_binaries not linked.$RESET"
    fi

    cd "$HYBRIDD/cli-wallet/"
    checkGit

else
    echo " [.] hybridd/cli-wallet not found."
fi


echo "[.] Validate hybridd/deterministic."
if [ -d "$HYBRIDD/deterministic" ]; then
    echo " [.] hybridd/deterministic found."

    if [ -L "$HYBRIDD/deterministic/common" ]; then
        echo " [.] hybridd/deterministic/common found."
        if [ "$(readlink $HYBRIDD/deterministic/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/deterministic/common linked correctly."
        else
            echo "RED [!] hybridd/deterministic/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/deterministic/common)$RESET"
        fi
    else
        echo "$RED [!] hybridd/deterministic/common not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/deterministic/interface" ]; then
        echo " [.] hybridd/deterministic/interface found."
        if [ "$(readlink $HYBRIDD/deterministic/interface)" = "$HYBRIDD/interface" ]; then
            echo " [.] hybridd/deterministic/interface linked correctly."
        else
            echo "$RED [!] hybridd/deterministic/interface linked incorrectly."
            echo "     Expected: $HYBRIDD/interface"
            echo "     Found:    $(readlink $HYBRIDD/deterministic/interface)$RESET"
        fi
    else
        echo "$RED [!] hybridd/deterministic/interface not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/deterministic/node_binaries" ]; then
        echo " [.] hybridd/deterministic/node_binaries found."
        if [ "$(readlink $HYBRIDD/deterministic/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/deterministic/node_binaries linked correctly."
        else
            echo "$RED [!] hybridd/deterministic/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/deterministic/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/deterministic/node_binaries not linked.$RESET"
    fi

    cd "$HYBRIDD/deterministic/"
    checkGit

else
    echo " [.] hybridd/deterministic not found."
fi


echo "[.] Validate hybridd/interface."
if [ -d "$HYBRIDD/interface" ]; then
    echo " [.] hybridd/interface found."

    if [ -L "$HYBRIDD/interface/common" ]; then
        echo " [.] hybridd/interface/common found."
        if [ "$(readlink $HYBRIDD/interface/common)" = "$HYBRIDD/common" ]; then
            echo " [.] hybridd/interface/common linked correctly."
        else
            echo "$RED [!] hybridd/interface/common linked incorrectly."
            echo "     Expected: $HYBRIDD/common"
            echo "     Found:    $(readlink $HYBRIDD/interface/common)$RESET"
        fi
    else
        echo "$RED [!] hybridd/interface/common not linked.$RESET"
    fi

    if [ -L "$HYBRIDD/interface/node_binaries" ]; then
        echo " [.] hybridd/interface/node_binaries found."
        if [ "$(readlink $HYBRIDD/interface/node_binaries)" = "$HYBRIDD/nodejs/$SYSTEM" ]; then
            echo " [.] hybridd/interface/node_binaries linked correctly."
        else
            echo "$RED [!] hybridd/interface/node_binaries linked incorrectly."
            echo "     Expected: $HYBRIDD/nodejs/$SYSTEM"
            echo "     Found:    $(readlink $HYBRIDD/interface/node_binaries)$RESET"
        fi
    else
        echo "$RED [!] hybridd/interface/node_binaries not linked.$RESET"
    fi

    cd "$HYBRIDD/interface/"
    checkGit

else
    echo " [.] hybridd/interface not found."
fi

echo "[.] Validate hybridd/common."
if [ -d "$HYBRIDD/common" ]; then
    echo " [.] hybridd/common found."
    cd "$HYBRIDD/common"
    checkGit

    #TODO check if up to date
else
    echo " [!] hybridd/common not found."
fi

export PATH="$OLDPATH"
cd "$WHEREAMI"
