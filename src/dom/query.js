
/**
 * @imports
 */
import _isString from '@webqit/util/js/isString.js';
import _arrFrom from '@webqit/util/arr/from.js';
import init from '../index.js';

/**
 * Creates a DOM element
 * from any of markup, selector, HTMLElement.
 *
 * @param mixed 				input
 *
 * @return Array
 */
export default function(input) {
	const WebQit = init.call(this);
	if (_isString(input)) {
		var els;
		if (input.trim().startsWith('<')) {
			// Create a node from markup
			var temp = WebQit.window.document.createElement('div');
			temp.innerHtml = input;
			els = [temp.firstChild];
		} else {
			els = _arrFrom(querySelectorAll.call(this, input));
		}
		return els;
	}
	if (input instanceof WebQit.window.Element) {
		return [input];
	}
	return _arrFrom(input);
}

/**
 * Queries a DOM context for elements matching
 * the given selector.
 *
 * @param string 				selector
 * @param document|Element	    context
 * @param bool		 			all
 *
 * @return Element|DOMNodeList
 */
export function querySelector(selector, context = null, all = false) {
	const WebQit = init.call(this);
    context = context || WebQit.window.document;
	var matchedItems, method = all ? 'querySelectorAll' : 'querySelector';
	try {
		matchedItems = context[method](selector);
	} catch(e) {
		try {
			matchedItems = context[method](selector.replace(/\:is\(/g, ':matches('));
		} catch(e) {
			try {
				matchedItems = context[method](selector.replace(/\:is\(/g, ':-webkit-any('));
			} catch(e) {
				try {
					matchedItems = context[method](selector.replace(/\:is\(/g, ':-moz-any('));
				} catch(e) {
					throw e;
				}
			}
		}
	}
	return matchedItems;
}

/**
 * Queries a DOM context for elements matching
 * the given selector.
 *
 * @param string 				selector
 * @param document|Element	    context
 *
 * @return DOMNodeList
 */
export function querySelectorAll(selector, context = bull) {
    return querySelector.call(this, selector, context, true);
}
