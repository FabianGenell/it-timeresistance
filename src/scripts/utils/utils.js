/**
 * Returns a function that as long as it continues to be invoked, won't be triggered.
 * @param {Function} fn - Callback function.
 * @param {number} [wait=300] - Delay (in milliseconds).
 * @returns {Function}
 */
export function debounce(fn, wait = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Adds a fast click event listener to an element.
 * @param {HTMLElement} el - The element to add the event listener to.
 * @param {Function} handler - The function to call when the event is triggered.
 * @returns {Function} - A function to remove the event listener.
 */
export function addFastClick(el, handler) {
    let touchFired = false;

    const onTouchStart = (e) => {
        touchFired = true;
        handler(e);
    };

    const onTouchEnd = () => {
        // Reset after one frame to avoid duplicate mousedown
        requestAnimationFrame(() => {
            touchFired = false;
        });
    };

    const onMouseDown = (e) => {
        if (touchFired) return;
        handler(e);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('mousedown', onMouseDown);

    return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('mousedown', onMouseDown);
    };
}

/**
 * Transforms a string from kebab-case to PascalCase.
 * @param {string} str - The input string in kebab-case.
 * @returns {string} - The transformed string in PascalCase.
 */
export function kebabToPascalCase(str) {
    return str
        .split('-') // Split the string by hyphens
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
        .join(''); // Join the words back together
}

/**
 * Logs a message to the DOM by creating an <h4> element with the message,
 * appending it to the body, and removing it after a specified delay.
 *
 * @param {string} message - The message to display in the <h4> element.
 * @param {number} [delay=3000] - The delay in milliseconds before removing the <h4> element. Default is 3000ms.
 */
export function logDOM(message, delay = 8000) {
    if (window.Shopify.theme.role != 'development') return;
    const h4 = document.createElement('h4');
    h4.textContent = message;
    h4.style.color = 'red';

    const logDomContainer = document.querySelector('[data-dom-log]') || document.body;

    logDomContainer.prepend(h4);

    setTimeout(() => {
        logDomContainer.removeChild(h4);
    }, delay);
}

/**
 * Waits for the animation to end on the specified element.
 *
 * @param {HTMLElement} element - The element to wait for the animation to end on.
 * @param {Function} [callback] - Optional callback function to execute when the animation ends.
 * @returns {Promise<void>} A promise that resolves when the animation ends.
 */
export async function afterAnimationEnd(element, callback) {
    return new Promise((resolve) => {
        function onEnd(event) {
            if (event.target !== element) return;

            element.removeEventListener('animationend', onEnd);
            element.removeEventListener('transitionend', onEnd);

            if (typeof callback === 'function') {
                callback();
            } else {
                console.warn('callback was not valid function', callback);
            }

            resolve();
        }

        element?.addEventListener('animationend', onEnd);
        element?.addEventListener('transitionend', onEnd);
    });
}

/**
 * Executes the provided callback function after the current call stack has cleared.
 *
 * @param {Function} callback - The function to be executed after the call stack clears.
 */
export function afterCallstack(callback, delay = 0) {
    setTimeout(() => {
        requestAnimationFrame(callback);
    }, delay);
}

export function formatMoney(cents, format = window.themeVariables.moneyFormat) {
    if (typeof cents == 'string') {
        cents = cents.replace('.', '');
    }
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;

    function formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
        if (isNaN(number) || number == null) {
            return 0;
        }

        number = (number / 100.0).toFixed(precision);

        const parts = number.split('.'),
            dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`),
            cents = parts[1] ? decimal + parts[1] : '';

        return dollars + cents;
    }

    switch (format.match(placeholderRegex)[1]) {
        case 'amount':
            value = formatWithDelimiters(cents, 2);
            break;
        case 'amount_no_decimals':
            value = formatWithDelimiters(cents, 0);
            break;
        case 'amount_with_comma_separator':
            value = formatWithDelimiters(cents, 2, '.', ',');
            break;
        case 'amount_no_decimals_with_comma_separator':
            value = formatWithDelimiters(cents, 0, '.', ',');
            break;
    }

    return format.replace(placeholderRegex, value);
}

export function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}
