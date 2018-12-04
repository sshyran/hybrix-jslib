// import nodeExternals from 'webpack-node-externals';

const path = require('path');

module.exports = {
  target: 'node',
  //  externals: [nodeExternals()],
  entry: './lib/interface.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/hybrixd.interface.nodejs.js',
    library: 'hybrixd',
    libraryTarget: 'commonjs2'
  }
};
