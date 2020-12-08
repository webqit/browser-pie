
/**
 * Detects vendor type from the given window object
 * 
 * @param window    window
 *
 * @return string
 */
export function getVendor(window) {
    // Firefox 1.0+
    var isFirefox = typeof window.InstallTrigger !== 'undefined';
    if (isFirefox) {
        return 'firefox';
    }
    // Safari 3.0+ "[object HTMLElementConstructor]" 
    var isSafari = /constructor/i.test(window.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (typeof window.safari !== 'undefined' && window.safari.pushNotification));
    if (isSafari) {
        return 'safari';
    }
    // Chrome 1 - 79
    var isChrome = !!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime);
    // Edge (based on chromium) detection
    var isEdgeChromium = isChrome && (window.navigator.userAgent.indexOf("Edg") != -1);
    // Opera 8.0+
    var isOpera = (!!window.opr && !!window.opr.addons) || !!window.opera || window.navigator.userAgent.indexOf(' OPR/') >= 0;

    // Internet Explorer 6-11
    var isIE = /*@cc_on!@*/false || !!window.document.documentMode;
    // Edge 20+
    var isEdge = !isIE && !!window.StyleMedia;
    // Blink engine detection
    var isBlink = (isChrome || isOpera) && !!window.CSS;
    return isEdge ? 'edge' : (
        isIE ? 'ie' : (
            isOpera ? 'opera' : (
                isEdgeChromium ? 'ie-chromium' : (
                    isChrome ? 'chrome' : 'unknown'
                )
            )
        )
    );
};

/**
 * Returns the vendor-specific property prefix.
 *
 * @return object
 */
export function getPrefix(window) {
    var styles = window.getComputedStyle(window.document.documentElement, '');
    var prefix = (Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/) || styles.Olink === '' && ['', 'o'])[1];
    var api = (('WebKit|Moz|Ms|O').match(new RegExp('(' + prefix + ')', 'i')) || [])[1];
    return {
        api,
        prefix,
        css: '-' + prefix + '-',
    };
};
