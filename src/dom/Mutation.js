
/**
 * @imports
 */
import _isString from '@webqit/util/js/isString.js';
import _difference from '@webqit/util/arr/difference.js';
import _arrFrom from '@webqit/util/arr/from.js';

/**
 * ---------------------
 * Ctxt Mutation Utilities
 * ---------------------
 */
export default class Mutation {
	
	/**
	 * Inits Ctxt.
	 *
	 * @return this
	 */
	static init(Ctxt) {
		if (Ctxt.Mutation) {
			return;
		}
		Ctxt.Mutation = new this(Ctxt);
	}

	/**
	 * Starts the loop.
	 *
	 * @return this
	 */
	constructor(Ctxt) {
		this.Ctxt = Ctxt;
	}

	/**
	 * ---------------------
	 * PRESENCE
	 * ---------------------
	 */
		
	/**
	 * Shortcut function to onPresenceChange().
	 *
	 * Observes when the given elements or selectors are added
	 * to the given context.
	 *
	 * @param window					window
	 * @param array|Element|string		els
	 * @param function					callback
	 * @param object					params
	 *
	 * @return MutationObserver
	 */
	onAdded(els, callback, params = {}) {
		params.on = 'added';
		return this.onPresenceChange(els, (el, presence) => {
			callback(el, presence);
		}, params);
	}

	/**
	 * Shortcut function to onPresenceChange().
	 *
	 * Observes when the given elements or selectors are removed
	 * from the given context.
	 *
	 * @param array|Element|string		els
	 * @param function					callback
	 * @param object					params
	 *
	 * @return MutationObserver
	 */
	onRemoved(els, callback, params = {}) {
		params.on = 'removed';
		return this.onPresenceChange(els, (el, presence) => {
			callback(el, presence);
		}, params);
	}

	/**
	 * Creates a MutationObserver that fires if currently, and whenever,
	 * the given element, or selector, is present in the Ctxt.
	 *
	 * @param string|Element				selector
	 * @param function						callback
	 * @param object						params
	 *
	 * @return void
	 */
	onPresent(selector, callback, params = {}) {
		// On Ctxt-ready
		this.Ctxt.ready.then(window => {
			// On Ctxt mutation
			if (window.MutationObserver) {
				this.onAdded(selector, (els, presence) => {
					els.forEach(el => callback(el, presence));
				}, params);
			}
			if (_isString(selector)) {
				// IMPORTANT: This must come after having observed mutations above
				// as the callback handler may trigger more additions
				_arrFrom(window.document.querySelectorAll(selector)).forEach(el => callback(el, 1));
			} else if (selector.parentNode) {
				callback(selector, 1);
			}
		});
	}

	/**
	 * Creates a MutationObserver that fires if currently, and whenever,
	 * the given element, or selector, is absent in the Ctxt.
	 *
	 * @param string|Element				selector
	 * @param function						callback
	 * @param object						params
	 *
	 * @return void
	 */
	onAbsent(selector, callback, params = {}) {
		// On Ctxt-ready
		this.Ctxt.ready.then(window => {
			// On Ctxt mutation
			if (window.MutationObserver) {
				onRemoved(selector, (els, presence) => {
					els.forEach(el => callback(el, presence));
				}, params);
			}
			if (_isString(selector)) {
				// IMPORTANT: This must come after having observed mutations above
				// as the callback handler may trigger more removals
				if (_arrFrom(window.document.querySelectorAll(selector)).length === 0) {
					callback(null, 0);
				}
			} else if (!selector.parentNode) {
				callback(selector, 0);
			}
		});
	}

	/**
	 * Observes when the given elements or selectors are added or removed
	 * from the given context.
	 *
	 * @param array|Element|string		els
	 * @param function					callback
	 * @param object					params
	 *
	 * @return MutationObserver
	 */
	onPresenceChange(els, callback, params = {}) {
		els = _arrFrom(els, false/*castObject*/);
		var search = (el, nodeListArray) => {
			// Filter out text nodes
			nodeListArray = nodeListArray.filter(node => node.matches);
			if (_isString(el)) {
				// Is directly mutated...
				var matches = nodeListArray.filter(node => node.matches(el));
				// Is contextly mutated...
				if (params.observeIndirectMutation !== false) {
					matches = nodeListArray
						.reduce((collection, node) => collection.concat(_arrFrom(node.querySelectorAll(el))), matches);
					if (matches.length) {
						return matches;
					}
				}
			} else {
				// Is directly mutated...
				if (nodeListArray.includes(el)) {
					return [el];
				}
				// Is contextly mutated...
				if (params.observeIndirectMutation !== false && nodeListArray.length) {
					var parentNode = el;
					while(parentNode = parentNode.parentNode) {
						if (nodeListArray.includes(parentNode)) {
							return [el];
						}
					}
				}
			}
		};
		var added = [], removed = [];
		var subject = params.context || this.Ctxt.window.document.documentElement;
		var mo = this._observe(subject, mutations => {
			var matchedAddedNodes = [];
			var matchedRemovedNodes = [];
			if (!params.on || params.on === 'added') {
				els.forEach(el => {
					if (_isString(el)) {
						matchedAddedNodes = mutations
							.reduce((matches, mut) => matches.concat(search(el, _arrFrom(mut.addedNodes)) || []), matchedAddedNodes);
					} else {
						var matchedAsAddedNode = mutations
							.reduce((match, mut) => match || (search(el, _arrFrom(mut.addedNodes)) || [])[0], null);
						if (matchedAsAddedNode) {
							matchedAddedNodes.push(matchedAsAddedNode);
						}
					}
				});
			}
			if (!params.on || params.on === 'removed') {
				els.forEach(el => {
					if (_isString(el)) {
						matchedRemovedNodes = mutations
							.reduce((matches, mut) => matches.concat(search(el, _arrFrom(mut.removedNodes)) || []), matchedRemovedNodes);
					} else {
						var matchedAsRemovedNode = mutations
							.reduce((match, mut) => match || (search(el, _arrFrom(mut.removedNodes)) || [])[0], null);
						if (matchedAsRemovedNode) {
							matchedRemovedNodes.push(matchedAsRemovedNode);
						}
					}
				});
			}
			var addedOnlyNodes = [];
			var initiallyRemovedThenAddedNodes = [];
			matchedAddedNodes.forEach(_el => {
				if (matchedRemovedNodes.includes(_el) && _el.isConnected) {
					initiallyRemovedThenAddedNodes.push(_el);
				} else {
					addedOnlyNodes.push(_el);
				}
			});
			var removedOnlyNodes = [];
			var initiallyAddedThenRemovedNodes = [];
			matchedRemovedNodes.forEach(_el => {
				if (matchedAddedNodes.includes(_el) && !_el.isConnected) {
					initiallyAddedThenRemovedNodes.push(_el);
				} else {
					removedOnlyNodes.push(_el);
				}
			});
			var fire = (list, state) => {
				if (list.length) {
					if (params.onceEach) {
						var cache = state ? added : removed;
						var _list = _difference(list, cache);
						if (_list.length) {
							cache.push(..._list);
							callback(_list, state);
						}
					} else {
						if (params.once) {
							mo.disconnect();
						}
						callback(list, state);
					}
				}
			};
			fire(addedOnlyNodes, 1);
			fire(initiallyAddedThenRemovedNodes, 0);
			fire(removedOnlyNodes, 0);
			fire(initiallyRemovedThenAddedNodes, 1);
		});
		return mo;
	}

	/**
	 * ---------------------
	 * MUTATIONS
	 * ---------------------
	 */

	/**
	 * Observes changes in attributes of the given element.
	 *
	 * @param Element					el
	 * @param function					callback
	 * @param array						filter
	 *
	 * @return MutationObserver
	 */
	onAttrChange(el, callback, filter = []) {
		var observer = new this.Ctxt.window.MutationObserver(callback);
		var params = {attributes:true, attributeOldValue:true};
		if (filter) {
			params.attributeFilter = filter;
		}
		observer.observe(el, params);
		return observer;
	}

	/**
	 * Observes changes in tree/subtree of the given element.
	 *
	 * @param Element					el
	 * @param function					callback
	 * @param bool						subtree
	 *
	 * @return MutationObserver
	 */
	onTreeChange(el, callback, subtree = false) {
		var observer = new this.Ctxt.window.MutationObserver(callback);
		var params = {childList:true, subtree};
		observer.observe(el, params);
		return observer;
	}

	/**
	 * Observes mutations on the given element.
	 *
	 * @param Element					el
	 * @param function					callback
	 * @param object					params
	 *
	 * @return MutationObserver
	 */
	onMutation(el, callback, params) {
		var observer = new this.Ctxt.window.MutationObserver(callback);
		observer.observe(el, params);
		return observer;
	}

	/**
	 * 
	 * @param Element subject 
	 * @param Function callback 
	 */
	_observe(subject, callback) {
		if (!MutationObserversCache.has(subject)) {
			const callbacks = [];
			const observer = new this.Ctxt.window.MutationObserver(mutations => {
				callbacks.forEach(callback => callback(mutations));
			});
			observer.observe(subject, {childList:true, subtree:true});
			MutationObserversCache.set(subject, {callbacks, observer});
		}
		const _observer = MutationObserversCache.get(subject);
		_observer.callbacks.push(callback);
		return {disconnect() {
			_observer.callbacks = _observer.callbacks.filter(cb => cb !== callback);
		}};
	}
};

const MutationObserversCache = new Map();
