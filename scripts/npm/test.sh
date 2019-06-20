#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
NODEINST=`which node`

# $HYBRIXD/interface/scripts/npm  => $HYBRIXD
SCRIPTDIR="`dirname \"$0\"`"
HYBRIXD="`cd \"$SCRIPTDIR/../../..\" && pwd`"

INTERFACE="$HYBRIXD/interface"

export PATH="$INTERFACE/node_binaries/bin:$PATH"

echo " [i] Running Interface tests"

TEST_INTERFACE_OUTPUT=$(node "$INTERFACE/test/test.js")
echo "$TEST_INTERFACE_OUTPUT"
SUCCESS_RATE=$(echo "$TEST_INTERFACE_OUTPUT" | grep "SUCCESS RATE: ")

PERCENTAGE=${SUCCESS_RATE//[a-zA-Z: %]/}
if [[ "$PERCENTAGE" -lt "80" ]]; then
    echo " [!] Interface test failed!"
    exit 1
else
    echo " [v] Interface test succeeded."
fi


export PATH="$OLDPATH"
cd "$WHEREAMI"
