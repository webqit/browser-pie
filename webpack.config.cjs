
/**
 * @imports
 */
const path = require('path');

/**
 * @exports
 */
module.exports = {
	mode: 'production',
	entry: {
		dom: './src/dom/browser-entry.js',
		apis: './src/apis/browser-entry.js',
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	devtool: 'source-map',
};