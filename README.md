# hybrix-jslib

This library can be used to connect software to leverage the
capabilities of the hybrix platform. It serves two purposes: first to
facilitate the logistics of interfacing with the hybrixd REST API,
secondly to handle all client-side operations securely and
privately. This ensures that keys required for transaction never leave
the users device and communication over an encrypted channel.

## Using hybrix-jslib

Please visit https://api.hybrix.io/help/hybrix-jslib.js for
information on installing and using hybrix-jslib.

## Contributing to hybrix-jslib

If you want to add features or change functionality of the
hybrix-jslib you can do this by forking or by creating pull requests
on

https://github.com/hybrix-io/hybrix-jslib

## Setup the development environment

Clone the development repository:

`$ git clone https://github.com/hybrix-io/hybrix-jslib.git`

To setup and install development dependencies run

`$ npm run setup`

## Overview

The hybrix-jslib methods are defined in

`./lib/methods/*.js`


## Building

To build the distributables run:

`$ npm run build`

This will result in the creation of the following files using webpack

```
./dist/hybrix-lib.nodejs.js, ./dist/hybrix-lib.web.js
```

which can be included as dependencies in your projects.
