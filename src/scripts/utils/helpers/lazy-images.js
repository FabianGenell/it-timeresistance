import { afterCallstack } from '../utils.js';

// Constants for load attributes
const LOAD_ATTRIBUTES = {
    DOM: 'data-load-dom',
    LOAD: 'data-load-load',
    MANUAL: 'data-load-manual'
};

const SELECTORS = {
    LAZY_IMAGES: '[loading="lazy"], [data-src]',
    PICTURE: 'PICTURE'
};

/**
 * Sets src and srcset attributes from data attributes for an element
 * @param {Element} el - Element to set attributes on
 */
function setImageAttr(el) {
    if (el.dataset.src && !el.src) {
        el.src = el.dataset.src;
    }

    if (el.dataset.srcset && !el.srcset) {
        el.srcset = el.dataset.srcset;
    }
}

/**
 * Checks if a lazy load image has alternate <source> elements and copies the
 * 'data-src' and 'data-srcset' selectors to 'src' and 'srcset' accordingly.
 * @param {Element} img - Image element.
 */
export function setImageSources(img) {
    if (!img) {
        console.warn('[LazyImages] Invalid image element provided');
        return;
    }

    try {
        if (img.parentNode?.tagName === SELECTORS.PICTURE) {
            Array.from(img.parentNode.children).forEach((el) => {
                setImageAttr(el);
            });
        } else {
            setImageAttr(img);
        }
    } catch (error) {
        console.error('[LazyImages] Error setting image sources:', error);
    }
}

function setImageSourceArray(imgElArray) {
    return imgElArray.forEach((img) => setImageSources(img));
}

/**
 * Initialises lazy load images.
 */
export function initLazyImages() {
    // Handle images with specific load timing first
    const imagesOnDOMLoad = [];
    const imagesOnLoad = [];
    const imagesForIntersectionObserver = [];

    document.querySelectorAll(SELECTORS.LAZY_IMAGES).forEach((img) => {
        if (img.hasAttribute(LOAD_ATTRIBUTES.DOM)) {
            imagesOnDOMLoad.push(img);
        } else if (img.hasAttribute(LOAD_ATTRIBUTES.LOAD)) {
            imagesOnLoad.push(img);
        } else if (img.hasAttribute(LOAD_ATTRIBUTES.MANUAL)) {
            return; // Skip manual loading images
        } else {
            // Images without specific load timing
            if ('loading' in HTMLImageElement.prototype === false && 'IntersectionObserver' in window) {
                imagesForIntersectionObserver.push(img);
            } else {
                setImageSources(img);
            }
        }
    });

    // Load images with specific timing
    loadImagesOnDOMLoaded(imagesOnDOMLoad);
    loadImagesOnLoaded(imagesOnLoad);

    // Use IntersectionObserver for remaining images if supported
    if (imagesForIntersectionObserver.length > 0) {
        console.log('intersection observer');
        const io = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        setImageSources(img);
                        observer.unobserve(img);
                    }
                });
            },
            { rootMargin: '0px 0px 500px 0px' }
        );

        imagesForIntersectionObserver.forEach((img) => {
            io.observe(img);
        });
    }
}

function loadImagesOnDOMLoaded(imageElArray) {
    console.debug('loadImagesOnDOMLoaded', imageElArray);
    const execute = () => afterCallstack(() => setImageSourceArray(imageElArray));

    if (document.readyState != 'loading') {
        return execute();
    }

    document.addEventListener('DOMContentLoaded', execute);
}

function loadImagesOnLoaded(imageElArray) {
    console.debug('loadImagesOnLoaded', imageElArray);
    const execute = () => afterCallstack(() => setImageSourceArray(imageElArray));

    if (document.readyState == 'complete') {
        return execute();
    }

    window.addEventListener('load', execute);
}

/**
 * Loads all images manually (load, dom, manual, etc.)
 * @param {Document|Element} container - Container to search within
 */
export function loadManualImages(container = document) {
    console.debug('loadManualImages', container);
    try {
        const imageEls = container.querySelectorAll('[loading="lazy"]');
        setImageSourceArray(imageEls);
    } catch (error) {
        console.error('[LazyImages] Error loading manual images:', error);
    }
}

afterCallstack(initLazyImages);
document.addEventListener('DOMContentLoaded', initLazyImages);

document.addEventListener('shopify:section:load', () => afterCallstack(initLazyImages));
