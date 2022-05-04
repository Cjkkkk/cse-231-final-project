const path = require('path');
module.exports = {
    mode: 'development',
    entry: './webstart.ts',
    module: {
        rules: [
        {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        },
        ],
    },
    devtool: 'inline-source-map',
    externals: {
        wabt: 'wabt',
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    output: {
        path: path.resolve(__dirname, "build"),
        filename: 'webstart.js'
    }
};