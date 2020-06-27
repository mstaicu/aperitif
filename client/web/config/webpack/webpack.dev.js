const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new Dotenv({
      path: './.env.development',
    }),
  ],
  devtool: 'source-map',
  devServer: {
    publicPath: '/',
    hot: true,
    watchOptions: {
      ignored: /node_modules/,
    },
  },
};
