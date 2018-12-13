// import nodeExternals from 'webpack-node-externals';

const path = require('path');

module.exports = {
  target: 'node',
  entry: './lib/interface.nodejs.js.tmp',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/hybrix-lib.nodejs.js',
    library: 'Hybrix',
    libraryTarget: 'commonjs2'
  }
};
