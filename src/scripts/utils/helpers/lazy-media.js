import { afterCallstack } from '../utils.js';

// Constants for load attributes
const LOAD_ATTRIBUTES = {
    DOM: 'data-load-dom',
    LOAD: 'data-load-load',
    MANUAL: 'data-load-manual'
};

const SELECTORS = {
    LAZY_MEDIA: '[loading="lazy"], [data-src], [data-poster]',
    PICTURE: 'PICTURE'
};

/**
 * Sets src, srcset, and poster attributes from data attributes for an element
 * @param {Element} el - Element to set attributes on
 */
function setMediaAttr(el) {
    if (el.dataset.src && !el.src) {
        el.src = el.dataset.src;
    }

    if (el.dataset.srcset && !el.srcset) {
        el.srcset = el.dataset.srcset;
    }

    if (el.dataset.poster && !el.poster) {
        el.poster = el.dataset.poster;
    }
}

/**
 * Checks if a lazy load media element has alternate <source> elements and copies the
 * 'data-src' and 'data-srcset' selectors to 'src' and 'srcset' accordingly.
 * @param {Element} media - Media element (image or video).
 */
export function setMediaSources(media) {
    if (!media) {
        console.warn('[LazyMedia] Invalid media element provided');
        return;
    }

    try {
        if (media.parentNode?.tagName === SELECTORS.PICTURE) {
            Array.from(media.parentNode.children).forEach((el) => {
                setMediaAttr(el);
            });
        } else {
            setMediaAttr(media);
        }
    } catch (error) {
        console.error('[LazyMedia] Error setting media sources:', error);
    }
}

function setMediaSourceArray(mediaElArray) {
    return mediaElArray.forEach((media) => setMediaSources(media));
}

/**
 * Initialises lazy load media (images and videos).
 */
export function initLazyMedia() {
    // Handle media elements with specific load timing first
    const mediaOnDOMLoad = [];
    const mediaOnLoad = [];
    const mediaForIntersectionObserver = [];

    document.querySelectorAll(SELECTORS.LAZY_MEDIA).forEach((media) => {
        if (media.hasAttribute(LOAD_ATTRIBUTES.DOM)) {
            mediaOnDOMLoad.push(media);
        } else if (media.hasAttribute(LOAD_ATTRIBUTES.LOAD)) {
            mediaOnLoad.push(media);
        } else if (media.hasAttribute(LOAD_ATTRIBUTES.MANUAL)) {
            return; // Skip manual loading media
        } else {
            // Media elements without specific load timing
            if ('loading' in HTMLImageElement.prototype === false && 'IntersectionObserver' in window) {
                mediaForIntersectionObserver.push(media);
            } else {
                setMediaSources(media);
            }
        }
    });

    // Load media with specific timing
    loadMediaOnDOMLoaded(mediaOnDOMLoad);
    loadMediaOnLoaded(mediaOnLoad);

    // Use IntersectionObserver for remaining media if supported
    if (mediaForIntersectionObserver.length > 0) {
        console.log('intersection observer');
        const io = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const media = entry.target;
                        setMediaSources(media);
                        observer.unobserve(media);
                    }
                });
            },
            { rootMargin: '0px 0px 500px 0px' }
        );

        mediaForIntersectionObserver.forEach((media) => {
            io.observe(media);
        });
    }
}

function loadMediaOnDOMLoaded(mediaElArray) {
    console.debug('loadMediaOnDOMLoaded', mediaElArray);
    const execute = () => afterCallstack(() => setMediaSourceArray(mediaElArray));

    if (document.readyState != 'loading') {
        return execute();
    }

    document.addEventListener('DOMContentLoaded', execute);
}

function loadMediaOnLoaded(mediaElArray) {
    console.debug('loadMediaOnLoaded', mediaElArray);
    const execute = () => afterCallstack(() => setMediaSourceArray(mediaElArray));

    if (document.readyState == 'complete') {
        return execute();
    }

    window.addEventListener('load', execute);
}

/**
 * Loads all media elements manually (load, dom, manual, etc.)
 * @param {Document|Element} container - Container to search within
 */
export function loadManualMedia(container = document) {
    console.debug('loadManualMedia', container);
    try {
        const mediaEls = container.querySelectorAll('[loading="lazy"]');
        setMediaSourceArray(mediaEls);
    } catch (error) {
        console.error('[LazyMedia] Error loading manual media:', error);
    }
}

afterCallstack(initLazyMedia);
document.addEventListener('DOMContentLoaded', initLazyMedia);

document.addEventListener('shopify:section:load', () => afterCallstack(initLazyMedia));

// For backwards compatibility
export const setImageSources = setMediaSources;
export const initLazyImages = initLazyMedia;
export const loadManualImages = loadManualMedia;