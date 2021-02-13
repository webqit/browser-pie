
/**
 * @imports
 */
import _isEmpty from '@webqit/util/js/isEmpty.js';
import { getVendor, getPrefix } from './vendor.js';

/**
 * ---------------------------
 * Centralized ENV initializer
 * for actual and virtual browser environments.
 * ---------------------------
 */

 export default class ENV {
    static create(window, scope = null, params = {}) {
        // Create global scope?
        if (!window.WQ) {
            window.WQ = {};
        }
        if (!window.WQ.window) {
            // Is this params for global or sub scope?
            let _params = scope ? {} : params;
            let _vendor, _prefix;
            Object.defineProperty(window.WQ, 'window', {get: () => window});
            Object.defineProperty(window.WQ, 'params', {get: () => _params});
            Object.defineProperty(window.WQ, 'vendor', {get: () => {
                if (!_vendor) {
                    _vendor = getVendor(window);
                }
                return _vendor;
            }});
            Object.defineProperty(window.WQ, 'prefix', {get: () => {
                if (!_prefix) {
                    _prefix = getPrefix(window);
                }
                return _prefix;
            }});
        } else if (!scope && !_isEmpty(params) && window.WQ.params !== params) {
            throw new Error('Window has already been initialized with a different parans object.')
        }
        // Create sub scope
        if (scope) {
            if (!window.WQ[scope]) {
                window.WQ[scope] = {
                    get params() {
                        return params;
                    }
                };
                Object.setPrototypeOf(window.WQ[scope], window.WQ);
            } else if (!_isEmpty(params) && window.WQ[scope].params !== params) {
                throw new Error('"' + scope + '" has already been initialized with a different parans object.')
            }
            return window.WQ[scope];
        }
        return window.WQ;
    }
 };