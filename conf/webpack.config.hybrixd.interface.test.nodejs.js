// import nodeExternals from 'webpack-node-externals';

const path = require('path');

module.exports = {
  target: 'node',
  entry: './test/lib/main.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/test.js',
    library: 'HybrixTest',
    libraryTarget: 'commonjs2'
  }
};
