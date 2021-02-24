
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
		return this.onPresenceChange(els, (el, presence, isTransient, addedState, removedState) => {
			callback(el, presence, isTransient, addedState, removedState);
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
		return this.onPresenceChange(els, (el, presence, isTransient, addedState, removedState) => {
			callback(el, presence, isTransient, addedState, removedState);
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
		var match = (els, sourceArray) => {
			// -------------------------------
			// Search can be expensive...
			// Multiple listeners searching the same thing in the same list?
			if (!sourceArray.$$searchCache) {
				sourceArray.$$searchCache = new Map();
			}
			// -------------------------------
			return els.reduce((matches, el) => {
				// -------------------------------
				var _matches;
				if (sourceArray.$$searchCache.has(el)) {
					_matches = sourceArray.$$searchCache.get(el);
				} else {
					_matches = search(el, sourceArray, _isString(el)) || [];
					sourceArray.$$searchCache.set(el, _matches);
				}
				return matches.concat(_matches);
			}, []);
		};
		var addedState = new Set(), removedState = new Set();
		var fire = (list, state, isTransient) => {
			if ((state && params.on === 'removed') || (!state && params.on === 'added')) {
				return;
			}
			if ((list = match(els, list)).length) {
				if (params.maintainCallState) {
					list.forEach(el => {
						if (state) {
							addedState.add(el);
							removedState.delete(el);
						} else {
							addedState.delete(el);
							removedState.add(el);
						}
					});
					callback(list, state, isTransient, addedState, removedState);
				} else {
					callback(list, state, isTransient);
				}
			}
		};
		var subject = params.context || this.Ctxt.window.document.documentElement;
		var mo = this._observe(subject, (removed__addedNodes, added__removedNodes, addedNodes, removedNodes) => {
			if (!params.ignoreTransients) {
				fire(removed__addedNodes, 0, true);
				fire(removed__addedNodes.concat(added__removedNodes), 1, true);
				fire(added__removedNodes, 0, true);
			}
			fire(removedNodes, 0);
			fire(addedNodes, 1);
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
			const callbacks = new Set();
			const observer = new this.Ctxt.window.MutationObserver(mutations => {
				if (!callbacks.size) {
					return;
				}

				var addedNodes = mutations.reduce((list, mut) => list.concat(_arrFrom(mut.addedNodes)), []),
				removedNodes = mutations.reduce((list, mut) => list.concat(_arrFrom(mut.removedNodes)), []),
				removed__addedNodes = [],
				added__removedNodes = [];

				addedNodes = new Set(addedNodes);
				removedNodes = new Set(removedNodes);
				addedNodes.forEach(el => {
					if (removedNodes.has(el)) {
						removedNodes.delete(el);
						addedNodes.delete(el);
						if (el.isConnected) {
							removed__addedNodes.push(el);
						} else {
							added__removedNodes.push(el);
						}
					}
				});
				
				addedNodes = [...addedNodes];
				removedNodes = [...removedNodes];

				callbacks.forEach(callback => callback(removed__addedNodes, added__removedNodes, addedNodes, removedNodes));
			});
			observer.observe(subject, {childList:true, subtree:true});
			MutationObserversCache.set(subject, {callbacks, observer});
		}
		const _observer = MutationObserversCache.get(subject);
		_observer.callbacks.add(callback);
		return {disconnect() {
			_observer.callbacks.delete(callback);
		}, reconnect() {
			_observer.callbacks.add(callback);
		}};
	}
};

const MutationObserversCache = new Map();
