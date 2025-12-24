//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/** @type {import('webpack').Configuration} */
const viewerConfig = {
    target: 'web',
    mode: 'none',
    entry: './src/viewer/index.tsx',
    output: {
        path: path.resolve(__dirname, 'dist', 'viewer'),
        filename: 'molstar-viewer.js',
        libraryTarget: 'umd',
        globalObject: 'this'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        fallback: {
            // Node.js polyfills for browser
            'fs': false,
            'path': false,
            'crypto': false,
            'stream': false,
            'buffer': require.resolve('buffer/'),
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.viewer.json'
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.scss$/,
                use: ['style-loader', 'css-loader', 'sass-loader']
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: 'node_modules/molstar/build/viewer/molstar.css',
                    to: 'molstar.css'
                }
            ]
        }),
        // Define Node.js globals for browser environment
        new webpack.DefinePlugin({
            'process.env': JSON.stringify({}),
            'process.env.NODE_ENV': JSON.stringify('production'),
        }),
        // Provide Buffer global
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser',
        })
    ],
    devtool: 'source-map',
    performance: {
        hints: false,
        maxEntrypointSize: 5120000,
        maxAssetSize: 5120000
    }
};

module.exports = viewerConfig;

