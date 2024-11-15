const path = require('path');

module.exports = {
  entry: './static/js/index.tsx',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.css'],
    modules: [path.resolve(__dirname, 'static'), 'node_modules'],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'static/js'),
  },
};