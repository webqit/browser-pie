
/**
 * @imports
 */
import init from '../index.js';

export default function(callback) {
    const WebQit = init.call(this);
    if (WebQit.DOM.isDOMReady || WebQit.window.document.readyState === 'complete') {
        callback(WebQit.window);
    } else {
        if (!WebQit.window.domReadyCallbacks) {
            WebQit.window.domReadyCallbacks = [];
            WebQit.window.document.addEventListener('DOMContentLoaded', () => {
                WebQit.DOM.isDOMReady = true;
                WebQit.window.domReadyCallbacks.splice(0).forEach(cb => cb(WebQit.window));
            }, false);
        }
        WebQit.window.domReadyCallbacks.push(callback);
    }
}
