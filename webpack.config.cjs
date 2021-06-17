
/**
 * @imports
 */
const path = require('path');

/**
 * @exports
 */
module.exports = {
	mode: process.argv.includes('--dev') ? 'development' : 'production',
	entry: {
		apis: './src/apis/browser-entry.js',
		dom: './src/dom/browser-entry.js',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	devtool: 'source-map',
};
