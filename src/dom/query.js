
/**
 * @imports
 */
import _isString from '@webqit/util/js/isString.js';
import _arrFrom from '@webqit/util/arr/from.js';
import init from '../index.js';

/**
 * Creates one or a list of DOM elements
 * from an input of markup, selector, HTMLElement.
 *
 * @param mixed 				input
 * @param document|Element	    context
 * @param bool		 			all
 *
 * @return Element|Array
 */
export default function query(input, context = null, all = false) {
	const WebQit = init.call(this);
	if (_isString(input)) {
		var els;
		if (input.trim().startsWith('<')) {
			// Create a node from markup
			var temp = WebQit.window.document.createElement('div');
			temp.innerHTML = input;
			els = all ? _arrFrom(temp.children) : temp.firstChild;
		} else {
			els = all ? _arrFrom(querySelectorAll.call(this, input, context)) : querySelector.call(this, input, context);
		}
		return els;
	}
	if (input instanceof WebQit.window.Element) {
		return all ? [input] : input;
	}
	return all ? _arrFrom(input) : input;
}

/**
 * Creates a list of DOM elements
 * from an input of markup, selector, HTMLElement.
 *
 * @param mixed 				input
 * @param document|Element	    context
 *
 * @return Array
 */
export function queryAll(selector, context = null) {
    return query.call(this, selector, context, true);
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
export function querySelectorAll(selector, context = null) {
    return querySelector.call(this, selector, context, true);
}
