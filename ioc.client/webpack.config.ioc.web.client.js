const path = require('path');

module.exports = {
  entry: './interface.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: 'ioc.web.client.js.tmp',
    library: 'IoC' // added to create a library file
  }
};
