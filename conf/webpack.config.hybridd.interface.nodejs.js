// import nodeExternals from 'webpack-node-externals';

const path = require('path');

module.exports = {
  target: 'node',
  //  externals: [nodeExternals()],
  entry: './lib/interface.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/hybridd.interface.nodejs.js',
    library: 'Hybridd',
    libraryTarget: 'commonjs2'
  }
};
