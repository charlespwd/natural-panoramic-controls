const webpack = require('webpack');
module.exports = {
  entry: './example.js',
  output: 'bundle.js',
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
