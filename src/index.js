
/**
 * @imports
 */
import _isObject from '@webqit/util/js/isObject.js';
import {
    getName as getVendorName,
    getPrefix as getVendorPrefix
} from './vendor.js';

/**
 * ---------------------------
 * Centralized ENV initializer
 * for actual and virtual browser environments.
 * ---------------------------
 */

export default function() {
    if (!(_isObject(this) && this.window) && (typeof window === 'undefined')) {
        throw new Error('A window context is required.');
    }
    const _window = _isObject(this) && this.window ? this.window : window;
    // Create global scope?
    if (!_window.WebQit) {
        _window.WebQit = {};
    }
    if (!_window.WebQit.window) {
        // Is this params for global or sub scope?
        let _vendor, _prefix;
        Object.defineProperty(_window.WebQit, 'window', {get: () => _window});
        Object.defineProperty(_window.WebQit, 'vendor', {value: {
            getName: () => {
                if (!_vendor) {
                    _vendor = getVendorName(_window);
                }
                return _vendor;
            },
            getPrefix: () => {
                if (!_prefix) {
                    _prefix = getVendorPrefix(_window);
                }
                return _prefix;
            }
        }});
    }
    return _window.WebQit;
 }