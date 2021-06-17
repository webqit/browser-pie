
/**
 * @imports
 */
import init from '../index.js';
import matchRect from './matchRect.js';
import fetch from './fetch.js';

/**
 * ---------------------------
 * API-Scope initializations.
 * ---------------------------
 */

export default function() {
    const WebQit = init.call(this);
    if (WebQit.APIS) {
        return WebQit;
    }
    WebQit.APIS = {};
    WebQit.APIS.matchRect = matchRect;
    WebQit.APIS.fetch = fetch;
    // ------
    return WebQit;
}