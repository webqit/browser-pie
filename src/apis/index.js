
/**
 * @imports
 */
import ENV from '../ENV.js';
import matchRect from './matchRect.js';
import fetch from './fetch.js';

/**
 * ---------------------------
 * API-Scope initializations.
 * ---------------------------
 */

 export default function init(window, params = {}) {
    const Ctxt = ENV.create(window, 'APIS', params);
    // ------
    Ctxt.matchRect = matchRect;
    Ctxt.fetch = fetch;
    // ------
    return Ctxt;
};