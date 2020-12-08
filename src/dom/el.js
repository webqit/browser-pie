
/**
 * @imports
 */
import _isString from '@webqit/util/js/isString.js';
import { querySelector } from './polyfills.js';

/**
 * Creates a DOM element
 * from any of markup, selector, HTMLElement.
 *
 * @param window 				window
 * @param mixed 				input
 *
 * @return bool
 */
export default function(window, input) {
	if (_isString(input)) {
		var el;
		if (input.trim().startsWith('<')) {
			// Create a node from markup
			var temp = window.document.createElement('div');
			temp.innerHtml = input;
			el = temp.firstChild;
		} else {
			el = querySelector(window, input);
		}
		return el;
	}
	return input;
};
