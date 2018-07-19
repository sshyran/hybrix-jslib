#!/bin/sh
OLDPATH=$PATH
WHEREAMI=`pwd`
export PATH=$WHEREAMI/../../../node/bin:"$PATH"
NODEINST=`which node`

# Generate API documentation
jsdoc interface.js

# Generate libary that can be imported into Node projects
../node_modules/webpack/bin/webpack.js --config webpack.config.ioc.nodejs.client.js

# Generate libary that can be imported into html pages
../node_modules/webpack/bin/webpack.js --config webpack.config.ioc.web.client.js
cat ../crypto/nacl.js ioc.web.client.js.tmp  > ioc.web.client.js
rm ioc.web.client.js.tmp

PATH=$OLDPATH
