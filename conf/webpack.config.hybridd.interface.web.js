const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './lib/interface.js',
  output: {
    path: path.resolve(__dirname, '.'),
    filename: '../dist/hybridd.interface.web.js.tmp',
    library: 'Hybridd' // added to create a library file
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
        }*/
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
