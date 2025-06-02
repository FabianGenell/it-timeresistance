export function qs(n, t) {
    return void 0 === t && (t = document), t.querySelector(n);
}
export function qsa(n, t) {
    return void 0 === t && (t = document), [].slice.call(t.querySelectorAll(n));
}
export function forEachElementOrArray(n, t) {
    return Array.isArray(n) ? n.forEach(t) : t(n);
}
export function createEventListenerAction(n) {
    return function (t, r, e) {
        return forEachElementOrArray(t, function (t) {
            return t[n + 'EventListener'](r, e);
        });
    };
}
export function listen(n, t, c) {
    return (
        createEventListenerAction('add')(n, t, c),
        function () {
            return createEventListenerAction('remove')(n, t, c);
        }
    );
}
export function createClassListAction(n) {
    return function (t) {
        var r = arguments;
        return forEachElementOrArray(t, function (t) {
            var c;
            return (c = t.classList)[n].apply(c, [].slice.call(r, 1));
        });
    };
}
export function addClass(n) {
    createClassListAction('add').apply(void 0, [n].concat([].slice.call(arguments, 1)));
}
export function removeClass(n) {
    createClassListAction('remove').apply(void 0, [n].concat([].slice.call(arguments, 1)));
}
export function toggleClass(n) {
    createClassListAction('toggle').apply(void 0, [n].concat([].slice.call(arguments, 1)));
}
export function hasClass(n, t) {
    return n.classList.contains(t);
}

export function getDefaultExportFromCjs(x) {
    return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}
