
/**
 * Applies all supported polyfills
 */
export default function(window) {
    CSS_escape(window);
    Node_isConnected(window);
    Element_matches(window);
}

/**
 * Polyfills the window.CSS object.
 *  
 * @return void
 */
export function CSS_escape(window) {
    if (!window.CSS) {
        window.CSS = {};
    }
    if (!window.CSS.escape) {
        /**
         * Polyfills the window.CSS.escape() function.
         *  
         * @param string str 
         * 
         * @return string
         */
        window.CSS.escape = str => str.replace(/([\:@\~\$\&])/g, '\\$1');
    }
}

/**
 * Polyfills the Node.prototype.isConnected property
 * 
 * @see MDN
  *  
 * @return bool
*/
export function Node_isConnected(window) {
    if (!('isConnected' in window.Node.prototype)) {
        Object.defineProperty(window.Node.prototype, 'isConnected', {get: function() {
            return !this.ownerDocument || !(
                this.ownerDocument.compareDocumentPosition(this)
                & this.DOCUMENT_POSITION_DISCONNECTED);
        }});
    }
}

/**
 * Polyfills the Element.prototype.matches() method
 * 
 * @see MDN
  *  
 * @return void
*/
export function Element_matches(window) {
    if (!window.Element.prototype.matches) {
        window.Element.prototype.matches = 
        window.Element.prototype.matchesSelector || 
        window.Element.prototype.mozMatchesSelector ||
        window.Element.prototype.msMatchesSelector || 
        window.Element.prototype.oMatchesSelector || 
        window.Element.prototype.webkitMatchesSelector ||
        function(s) {
            var matches = (this.document || this.ownerDocument).querySelectorAll(s),
                i = matches.length;
            while (--i >= 0 && matches.item(i) !== this) {}
            return i > -1;            
        };
    }
}