const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = [
  // Main process
  {
    mode: 'development',
    entry: './src/main/index.ts',
    target: 'electron-main',
    module: {
      rules: [{
        test: /\.ts$/,
        include: /src/,
        use: 'ts-loader'
      }]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'main.js'
    }
  },
  // Preload script
  {
    mode: 'development',
    entry: './src/preload/preload.ts',
    target: 'electron-preload',
    module: {
      rules: [{
        test: /\.ts$/,
        include: /src/,
        use: 'ts-loader'
      }]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'preload.js'
    }
  },
  // Renderer process
  {
    mode: 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          include: /src/,
          use: 'ts-loader'
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'renderer.js'
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html'
      })
    ]
  }
];