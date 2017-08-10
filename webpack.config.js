const path = require('path');
const webpack = require('webpack');
module.exports = {
  entry: './example.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'example'),
    publicPath: '/example/',
  },
  devServer: {
    contentBase: '.',
    hot: true,
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env', 'stage-0']
          }
        }
      }
    ]
  }
}
