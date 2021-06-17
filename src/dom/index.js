
/**
 * @imports
 */
import init from '../index.js';
import Reflow from './Reflow.js';
import Mutations from './Mutations.js';
import polyfill from './polyfills.js';
import query, { querySelector, querySelectorAll } from './query.js';
import ready from './ready.js';
import meta from './meta.js';

/**
 * ---------------------------
 * Ctxt-Scope initializations.
 * ---------------------------
 */

export default function() {
    const WebQit = init.call(this);
    if (WebQit.DOM) {
        return WebQit;
    }
    WebQit.DOM = {};
    polyfill(WebQit.window);
    WebQit.DOM.reflow = new Reflow(WebQit.window);
    WebQit.DOM.mutations = new Mutations(WebQit.window);
    WebQit.DOM.meta = meta.bind(WebQit.window);
    WebQit.DOM.query = query.bind(WebQit.window);
    WebQit.DOM.ready = ready.bind(WebQit.window);
    // ------
    return WebQit;
}

export {
    meta,
    query,
    querySelector,
    querySelectorAll,
    ready,
}