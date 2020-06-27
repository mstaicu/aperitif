const Dotenv = require('dotenv-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    new CopyWebpackPlugin([{ from: 'public' }]),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
    new Dotenv({
      path: './.env.production',
    }),
  ],
};
