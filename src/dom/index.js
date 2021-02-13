
/**
 * @imports
 */
import ENV from '../ENV.js';
import Reflow from './Reflow.js';
import Mutation from './Mutation.js';
import polyfill from './polyfills.js';
import el from './el.js';

/**
 * ---------------------------
 * Ctxt-Scope initializations.
 * ---------------------------
 */

export default function init(window, params = {}) {
    if (window.WQ && window.WQ.DOM) {
        return window.WQ.DOM;
    }
    const Ctxt = ENV.create(window, 'DOM', params);
    Ctxt.ready = new Promise(resolve => {
        window.document.addEventListener('DOMContentLoaded', () => resolve(window), false);
        if (window.document.readyState === 'complete') {
            resolve(window);
        }
    });
    Ctxt.el = query => el(window, query);
    // ------
    polyfill(Ctxt);
    Reflow.init(Ctxt);
    Mutation.init(Ctxt);
    // ------
    return Ctxt;
};