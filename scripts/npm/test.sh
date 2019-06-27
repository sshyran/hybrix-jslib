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

node "$NODE/interface/test.js" --path="$NODE/interface" | tee output

TEST_INTERFACE_OUTPUT=$(cat output)

SUCCESS_RATE=$(echo "$TEST_INTERFACE_OUTPUT" | grep "SUCCESS RATE")
rm output

# "      SUCCESS RATE :${PERCENTAGE}%' => "$PERCENTAGE"
PERCENTAGE=$(echo $SUCCESS_RATE| cut -d':' -f2  | cut -d'%' -f1)

if [ "$PERCENTAGE" -lt "80" ]; then
    echo " [!] Interface test failed!"
    exit 1
else
    echo " [v] Interface test succeeded."
fi


export PATH="$OLDPATH"
cd "$WHEREAMI"
