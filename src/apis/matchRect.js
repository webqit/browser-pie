
/**
 * @imports
 */
import Lexer from '@webqit/util/str/Lexer.js';
import _isObject from '@webqit/util/js/isObject.js';
import _isNumeric from '@webqit/util/js/isNumeric.js';
import _isBoolean from '@webqit/util/js/isBoolean.js';
import _isEmpty from '@webqit/util/js/isEmpty.js';
import _wrapped from '@webqit/util/str/wrapped.js';
import _unwrap from '@webqit/util/str/unwrap.js';
import _after from '@webqit/util/str/after.js';
import _toCamel from '@webqit/util/str/toCamel.js';
import _each from '@webqit/util/obj/each.js';
import _intersect from '@webqit/util/arr/intersect.js';
import _unique from '@webqit/util/arr/unique.js';
import _any from '@webqit/util/arr/any.js';

/**
 * @consts
 */

const parserCache = {};
const sizeProperties = ['width', 'height',];
const sizePropertiesAll = sizeProperties.concat(sizeProperties.map(prop => 'inner-' + prop), sizeProperties.map(prop => 'outer-' + prop));
const offsetProperties = ['top', 'left', 'right', 'bottom',];
const intersectionProperties = sizeProperties.map(prop => 'intersection-' + prop).concat(offsetProperties.map(prop => 'intersection-' + prop));
        
/**
 * ---------------------------
 * The Observable media query
 * ---------------------------
 *
 * This is a Container Query implementation.
 * Delivered as an observable.
 */

export default function matchRect(target, query, now = false) {
    var PQ = parserCache[query];
    if (!PQ) {
        PQ = parseQuery(query);
        PQ.meta.varNames = Object.keys(PQ.meta.vars);
        PQ.meta.argNames = Object.keys(PQ.meta.args);
        PQ.meta.matchedIntersectionProps = _intersect(intersectionProperties, PQ.meta.varNames);
        PQ.meta.matchedIntersectionThresholds = _unique(PQ.meta.matchedIntersectionProps.reduce((total, prop) => total.concat(PQ.meta.vars[prop]), []));
        PQ.meta.matchedOffsetProps = _intersect(offsetProperties, PQ.meta.varNames);
        PQ.meta.matchedSizeProps = _intersect(sizePropertiesAll, PQ.meta.varNames);
        PQ.meta.matchedPercentageSizeProps = _intersect(sizePropertiesAll, PQ.meta.varNames).filter(prop => _any(PQ.meta.vars[prop], CSSVal => CSSVal.endsWith('%')));
        parserCache[query] = PQ;
    }
    // ----------
    var dispatcher,
        RectQueryListInstance = new RectQueryList(_dispatcher => { dispatcher = _dispatcher; });
    // ----------
    var intersectRoot = PQ.meta.args['intersection-root'] === 'document' ? document : (PQ.meta.args['intersection-root'] === 'offset-parent' ? target.offsetParent : target.scrollParent);
    // ----------
    if (PQ.meta.matchedIntersectionProps.length) {
        // Observe intersection for target with given root
        // IntersectionObserverFactory() will maintain only one instance of IntersectionObserver
        // for "intersectRoot", globally. "target" will only be observed on an existing instance.
        IntersectionObserverFactory(target, query, dispatcher, intersectRoot, PQ.meta.matchedIntersectionThresholds);
    }
    if (PQ.meta.matchedSizeProps.length || PQ.meta.matchedOffsetProps.length || !query/* @see: [on-parent-resize] */) {
        // Observe target's resize
        // ResizeObserverFactory() will maintain only one instance of ResizeObserver
        // for "target", globally. "dispatcher" will only be added on an existing instance.
        const resizeObserversObjectForTarget = ResizeObserverFactory(target, query, dispatcher);
        // Observe offsetParent's resize?
        if (PQ.meta.matchedOffsetProps.length || PQ.meta.matchedPercentageSizeProps.length) {
            // If @previous-query isn't already observing its offsetParent
            // so that resizeObserversObjectForTarget isn't iterated twice on one parent-resize event
            if (!resizeObserversObjectForTarget.$.offsetParentRect) {
                // matchRect() will maintain only instance of ResizeObserver
                // for "offsetParent", globally. This matchRect() will only hook up on an existing instance.
                resizeObserversObjectForTarget.$.offsetParentRect = matchRect(target.offsetParent, ''); // @ref: [on-parent-resize]
                resizeObserversObjectForTarget.$.offsetParentRect.addEventListener('change', e => {
                    handleChange(target, e.detail, resizeObserversObjectForTarget, 'parent-resize');
                });
            }
            // if @hasIntersectionQueries isn't already just observing offsetParent
            // so that dispatcher isn't called twice on one intersection event
            if (!(PQ.meta.matchedIntersectionProps.length && intersectRoot === target.offsetParent)) {
                // IntersectionObserverFactory() will maintain only one instance of IntersectionObserver
                // for "offsetParent" pair, globally. "dispatcher" will only be added on an existing instance.
                IntersectionObserverFactory(target, query, dispatcher, target.offsetParent);
            }
        }
    }
    return RectQueryListInstance;
};

/**
 * ------------------
 * This is our custom event target that
 * delivers live values.
 * ------------------
 */

class RectQueryList extends EventTarget {
    constructor(initCallback) {
        super();
        var _rect = {};
        Object.defineProperty(this, 'rect', {get: () => _rect});
        const dispatcher = (matches, rect, query) => {
            // -----------
            // Note the order...
            var changed = !query || !('matches' in _rect) || !(matches === _rect.matches);
            rect.matches = matches;
            _rect = rect;
            if (changed) {
                this.dispatchEvent(new CustomEvent('change', {detail: rect}));
            }
            // -----------
        };
        initCallback(dispatcher);
    }
    get contentRect() { return this.rect.contentRect; }
    get contentBoxSize() { return this.rect.contentBoxSize; }
    get borderBoxSize() { return this.rect.borderBoxSize; }
    get matches() { return this.rect.matches; }
}

/**
 * ------------------
 * This change handler is called 
 * from the various codes observing
 * property changes
 * ------------------
 */

function handleChange(target, rect, registry, type, _root = null) {
    if (type === 'resize') {
        registry.$.rect = rect;
    } else if (type === 'parent-resize') {
        registry.$.offsetParentRect = rect;
    } else if (type === 'intersection') {
        registry.$.rect = rect.boundingClientRect;
        if (_root === target.offsetParent) {
            registry.$.offsetParentRect = rect.rootBounds;
        }
        registry.$.intersectionRect = rect;
    }
    // Note that some conditions above can be true
    // even if target.isConnected is false. So this is
    // place to return.
    if (!target.isConnected) {
        return;
    }
    _each(registry, (query, observers) => {
        // First filter out by thresholds
        if (type === 'intersection') {
            /** TODO
            observers = observers.filter(observer => {
                if (observer.threshold && !observer.threshold.includes(rect.intersectionRatio)) {
                    console.log(observer.threshold, rect.intersectionRatio);
                    return false;
                }
                return true;
            });
            */
        }
        if (observers.length) {
            var matches = evalQuery(parserCache[query], registry.$.rect, registry.$.offsetParentRect, registry.$.intersectionRect);
            observers.forEach(observer => {
                observer.callback(matches, registry.$.rect, query);
            });
        }
    });
}

/**
 * ------------------
 * We use one ResizeObserver instance for
 * all case, and only when needed.
 * ------------------
 */

var GlobalResizeObserverInstance;
const GlobalResizeCallbacks = new Map();
const ResizeObserverFactory = (target, query, callback = null) => {
    if (!GlobalResizeObserverInstance) {
        GlobalResizeObserverInstance = new ResizeObserver(entries => {
            entries.forEach(entry => {
                handleChange(entry.target, entry, GlobalResizeCallbacks.get(entry.target), 'resize');
            });
        });
    }
    var resizeRegistry = GlobalResizeCallbacks.get(target);
    if (!resizeRegistry) {
        resizeRegistry = {};
        Object.defineProperty(resizeRegistry, '$', {value:{}});
        GlobalResizeCallbacks.set(target, resizeRegistry);
        GlobalResizeObserverInstance.observe(target);
    }
    // Add to resizeRegistry
    // or get resizeRegistry?
    if (callback) {
        if (!resizeRegistry[query]) {
            resizeRegistry[query] = [];
            Object.defineProperty(resizeRegistry[query], '$', {value:{}});
        }
        resizeRegistry[query].push({callback});
    }
    return resizeRegistry;
};

/**
 * ------------------
 * We use one IntersectionObserver instance for
 * all cases of a root, and only when needed.
 * ------------------
 */

const GlobalIntersectionObserverInstances = new Map();
const IntersectionObserverFactory = (target, query, callback = null, root = null, threshold = null) => {
    // ---------------------
    var intersectionObserverForRoot = GlobalIntersectionObserverInstances.get(root);
    // ---------------------
    if (!intersectionObserverForRoot) {
        const _intersectionRegistry = new Map();
        const _threshold = [];
        for (var i = 0; i <= 100; i ++) {
            _threshold.push(Math.round(((i * 0.01) + Number.EPSILON) * 100) / 100);
        }
        intersectionObserverForRoot = {
            registries: _intersectionRegistry,
            instance: new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    handleChange(entry.target, entry, _intersectionRegistry.get(entry.target), 'intersection', root);
                });
            }, {
                root: root,
                threshold: _threshold,
            }),
        };
        GlobalIntersectionObserverInstances.set(root, intersectionObserverForRoot);
    }
    // ---------------------
    var intersectionRegistry = intersectionObserverForRoot.registries.get(target);
    if (!intersectionRegistry) {
        intersectionObserverForRoot.instance.observe(target);
        intersectionRegistry = {};
        Object.defineProperty(intersectionRegistry, '$', {value:{}});
        intersectionObserverForRoot.registries.set(target, intersectionRegistry);
    }
    // Add to intersectionRegistry
    // or get intersectionRegistry?
    if (callback) {
        if (!intersectionRegistry[query]) {
            intersectionRegistry[query] = [];
            Object.defineProperty(intersectionRegistry[query], '$', {value:{}});
        }
        intersectionRegistry[query].push({callback, threshold});
    }
    return intersectionRegistry;
};

/**
 * ------------------
 * This is our eval() set
 * of functions.
 * ------------------
 */

function evalQuery(queryObj, rect, offsetParentRect, intersectionRect) {
    if (_isEmpty(queryObj)) {
        return true;
    }
    // --------------
    if (_isObject(queryObj)) {
        var evalObj = {};
        _each(queryObj.queries, (id, _queryObj) => {
            var value = evalQuery(_queryObj, rect, offsetParentRect, intersectionRect);
            Object.defineProperty(evalObj, id, {get: () => value});
        });
        return evalObj;
    }
    // --------------
    return queryObj.reduce((evalObj, exprObj) => {
        evalObj.result = exprObj.operator === 'or'
            ? evalObj.result || exprObj.expr.eval(rect, offsetParentRect, intersectionRect) 
            : evalObj.result && exprObj.expr.eval(rect, offsetParentRect, intersectionRect);
        return evalObj;
    }, {result: true}).result;
}
// ---------------
function evalExpr(operand_a, operator, operand_b, rect, offsetParentRect, intersectionRect) {
    if (intersectionProperties.includes(operand_a)) {
        var contextualProp = operand_a.startsWith('intersection-') ? _after(operand_a, 'intersection-') : operand_a;
        operand_b = readVal(operand_b, contextualProp, intersectionRect.boundingClientRect/* percentages scope */);
        operand_a = readIntersection(operand_a, intersectionRect);
    } else {
        operand_b = readVal(operand_b, operand_a, offsetParentRect/* percentages scope */);
        if (sizePropertiesAll.includes(operand_a)) {
            operand_a = readRect(operand_a, rect);
        } else if (offsetProperties.includes(operand_a)) {
            operand_a = readRelativeOffset(operand_a, rect, offsetParentRect);
        } else {
            operand_a = readRect(_toCamel(operand_a), rect);
        }
    }
    var result;
    switch(operator) {
        case 'boolish':
            result = (operand_a && operand_b) || (!operand_a && !operand_b) ? true : false;
        break;
        case '<=':
            result = operand_a <= operand_b;
        break;
        case '>=':
            result = operand_a >= operand_b;
        break;
        case '<':
            result = operand_a < operand_b;
        break;
        case '>':
            result = operand_a > operand_b;
        break;
        default:
            result = operand_a === operand_b;
    }
    return result;
}
// ----------------
function readVal(val, prop, percentagesContextRect) {
    if (_isBoolean(val)) {
        return val;
    }
    if (_isNumeric(val)) {
        return parseFloat(val);
    }
    // ------------
    if (val.endsWith('%')) {
        var unit = val.substr(-1);
        val = parseFloat(val.substr(0, val.length - 1));
        var containerVal;
        if (['width', 'height'].includes(prop) || prop.endsWith('-width') || prop.endsWith('-height')) {
            containerVal = readRect(prop, percentagesContextRect);
        } else if (['left', 'right'].includes(prop) || prop.endsWith('-left') || prop.endsWith('-right')) {
            containerVal = readRect('width', percentagesContextRect);
        } else if (['top', 'bottom'].includes(prop) || prop.endsWith('-top') || prop.endsWith('-bottom')) {
            containerVal = readRect('height', percentagesContextRect);
        } else {         
            prop = _toCamel(prop);
            if (prop in percentagesContextRect) {
                containerVal = percentagesContextRect[prop];
            } else {
                containerVal = 1;
            }
        }
        return (val / 100) * containerVal;
    }
    // ------------
    var unit = val.substr(-2);
    val = parseFloat(val.substr(0, val.length - 2));
    switch(unit) {
        case 'px':
        break;
        default:
            throw new Error('The CSS unit "' + unit + '" is not currently supported.');
    }
    return val;
}
// -----------------
function readRect(prop, rect) {
    if (!rect) {
        return;
    }
    var rectObject;
    if (['inner-width', 'inner-height'].includes(prop) && rect.contentBoxSize) {
        prop = prop === 'inner-width' ? 'inlineSize' : 'blockSize';
        rectObject = rect.contentBoxSize[0];
    } else if (['outer-width', 'outer-height', 'width', 'height'].includes(prop) && rect.borderBoxSize) {
        prop = prop === 'outer-width' || prop === 'width' ? 'inlineSize' : 'blockSize';
        rectObject = rect.borderBoxSize[0];
    } else {
        prop = prop.startsWith('outer-') || prop.startsWith('inner-') ? prop.substr(0, 6) : prop;
        rectObject = rect.contentRect || rect;
    }
    return rectObject[prop];
}
function readRelativeOffset(prop, rect, offsetParentRect) {
    if (['top', 'left'].includes(prop)) {
        return readRect(prop, rect) - readRect(prop, offsetParentRect);
    }
    return readRect(prop, offsetParentRect) - readRect(prop, rect);
}
// ------------------
function readIntersection(prop, intersectionRect) {
    if (prop.startsWith('intersection-')) {
        prop = _after(prop, 'intersection-');
        if (['width', 'height'].includes(prop)) {
            return intersectionRect.intersectionRect[prop];
        }
        var inverses = {top: 'bottom', bottom: 'top', left: 'right', right: 'left'}
        if (['top', 'left'].includes(prop)) {
            return intersectionRect.rootBounds[inverses[prop]] - intersectionRect.boundingClientRect[prop];
        }
        return intersectionRect.boundingClientRect[prop] - intersectionRect.rootBounds[inverses[prop]];
    }
    return intersectionRect[_toCamel(prop)];
}
// ------------------

/**
 * ------------------
 * This is our parse() set
 * of functions.
 * ------------------
 */

function parseQuery(query) {
    // --------------------
    var parse = [], meta = {vars: {}, args: {}};
    var addVar = (varName, vals) => {
        if (!meta.vars[varName]) {
            meta.vars[varName] = [];
        }
        meta.vars[varName].push(...vals);
    };
    var addArg = (argName, val) => {
        if (argName in meta.args) {
            throw new Error('An argument may be set only once in a query. Duplicate: ' + argName);
        }
        meta.args[argName] = val;
    };
    // --------------------
    if (query) {
        // ---------------
        if (_wrapped(query, '{', '}')) {
            return Lexer.split(_unwrap(query, '{', '}'), [';']).reduce((obj, chunk) => {
                var [ id, query ] = Lexer.split(chunk, [':']).map(s => s.trim());
                obj.queries[id] = parseQuery(query);
                // -----
                _each(obj.queries[id].meta.vars, addVar);
                _each(obj.queries[id].meta.args, addArg);
            }, {queries: {}});
        }
        // ---------------
        var exprParse = Lexer.lex(query.toLowerCase(), [' and ', ' or ', ',', ' using ']);
        parse = exprParse.tokens.reduce((_exprList, _expr, i) => {
            var operator = (exprParse.matches[i - 1] || '').trim();
            // ------------
            // Are we in args phase
            if (operator === 'using' || !_isEmpty(meta.args)) {
                parseExpr(_expr.trim(), addArg);
                return _exprList;
            }
            // ------------
            var expr = parseExpr(_expr.trim(), (varName, ...vals) => addVar(varName, vals));
            if (!_exprList) {
                return [{expr, operator: 'and',}];
            }
            return _exprList.concat({expr, operator});
        }, null);
    }
    Object.defineProperty(parse, 'meta', {value: meta});
    return parse;
}
// ---------------
function parseExpr(expr, varsCallback) {
    var truthy = true;
    if (_wrapped(expr, '(', ')') || _wrapped(expr, 'not(', ')')) {
        if (_wrapped(expr, 'not(', ')')) {
            truthy = false;
            expr = _unwrap(expr, 'not(', ')');
        } else {
            expr = _unwrap(expr, '(', ')');
        }
    }
    var exprParse = Lexer.lex(expr, [':', '<=', '<', '>=', '>']);
    var exprSplit = exprParse.tokens.map(e => e.trim());
    // (operand_b_1 <= operand_a <= operand_b_2)
    if (exprSplit.length > 2) {
        var operand_b_1 = exprSplit[0],
            operand_a = exprSplit[1],
            operand_b_2 = exprSplit[2];
        // ---------------
        varsCallback(operand_a, operand_b_1, operand_b_2);
        // ---------------
        return {
            truthy,
            operand_a,
            operand_b: [{
                operand: operand_b_1,
                // Reverse operator
                operator: exprParse.matches[0].startsWith('<') ? '>' + _after(exprParse.matches[0], '<')
                    : (exprParse.matches[0].startsWith('>') ? '<' + _after(exprParse.matches[0], '>') : exprParse.matches[0]), // <=, >=
            }, {
                operand: operand_b_2,
                operator: exprParse.matches[1], // <=, >=

            }],
            eval(rect, offsetParentRect, intersectionRect) {
                return this.operand_b.reduce(
                    (prev, curr) => prev && evalExpr(this.operand_a, curr.operator, curr.operand, rect, offsetParentRect, intersectionRect), true
                ) === this.truthy;
            }
        };
    }
    // (operand_a: operand_b), (operand_a <= operand_b)
    if (exprSplit.length > 1) {
        const exprObj = {
            truthy,
            eval(rect, offsetParentRect, intersectionRect) {
                return evalExpr(this.operand_a, this.operator, this.operand_b, rect, offsetParentRect, intersectionRect) === this.truthy;
            }
        };
        exprObj.operand_a = exprSplit[0];
        exprObj.operand_b = exprSplit[1];
        exprObj.operator = exprParse.matches[0];
        if (exprObj.operator === ':') {
            exprObj.operator = '=';
            if (exprObj.operand_a.startsWith('min-')) {
                exprObj.operator = '>=';
                exprObj.operand_a = _after(exprObj.operand_a, 'min-');
            } else if (exprObj.operand_a.startsWith('max-')) {
                exprObj.operator = '<=';
                exprObj.operand_a = _after(exprObj.operand_a, 'max-');
            }
        }
        // ---------------
        varsCallback(exprObj.operand_a, exprObj.operand_b);
        // ---------------
        return exprObj;
    }
    // (expr)
    varsCallback(expr, true);
    return {
        truthy,
        expr: expr,
        eval(rect, offsetParentRect, intersectionRect) {
            return evalExpr(this.expr, 'boolish', true, rect, offsetParentRect, intersectionRect) === this.truthy;
        }
    };
}