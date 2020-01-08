const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './test/lib/web.js',

  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../test/test.web.js',
    library: 'HybrixTest' // added to create a library file
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/ /*,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env']
          }
        } */
      }
    ]
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
