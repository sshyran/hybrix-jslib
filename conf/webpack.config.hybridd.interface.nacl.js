const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './common/crypto/nacl.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/hybridd.interface.nacl.js.tmp'
  },
  plugins: [
    new UglifyJSPlugin({
      uglifyOptions: {
        compress: true,
        mangle: false,
        output: {
          beautify: false
        }
      }
    })
  ]
};
