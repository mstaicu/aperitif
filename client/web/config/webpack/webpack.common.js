const path = require('path');

module.exports = {
  entry: {
    main: path.join(__dirname, '../..', '/src/index.js'),
  },
  output: {
    path: path.resolve(__dirname, '../..', 'dist'),
    filename: '[name].[hash].bundle.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(woff|woff2)$/,
        loader: 'url-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@src': path.join(__dirname, '../../src'),
      '@config': path.join(__dirname, '../../config'),
    },
  },
};
