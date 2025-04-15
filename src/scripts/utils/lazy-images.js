import { afterCallstack } from './utils.js';

/**
 * Checks if a lazy load image has alternate <source> elements and copies the
 * 'data-src' and 'data-srcset' selectors to 'src' and 'srcset' accordingly.
 * @param {Element} img - Image element.
 */
export function setImageSources(img) {
    const setImageAttr = (el) => {
        if (el.dataset.src && !el.src) {
            el.src = el.dataset.src;
        }

        if (el.dataset.srcset && !el.srcset) {
            el.srcset = el.dataset.srcset;
        }
    };

    if (img.parentNode.tagName === 'PICTURE') {
        Array.from(img.parentNode.children).forEach((el) => {
            setImageAttr(el);
        });
    } else {
        setImageAttr(img);
    }
}

function setImageSourceArray(imgElArray) {
    return imgElArray.forEach((img) => setImageSources(img));
}

/**
 * Initialises lazy load images.
 */
export function initLazyImages() {
    if ('loading' in HTMLImageElement.prototype === false && 'IntersectionObserver' in window) {
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

        document.querySelectorAll('[loading="lazy"]').forEach((img) => {
            io.observe(img);
        });
    } else {
        // If native lazy load supported or IntersectionObserver not supported (legacy browsers).
        const imagesOnDOMLoad = [];
        const imagesOnLoad = [];

        document.querySelectorAll('[loading="lazy"], [data-src]').forEach((img) => {
            if (img.hasAttribute('data-load-dom')) {
                imagesOnDOMLoad.push(img);
            } else if (img.hasAttribute('data-load-load')) {
                imagesOnLoad.push(img);
            } else if (img.hasAttribute('data-load-manual')) {
                return;
            } else {
                setImageSources(img);
            }
        });

        loadImagesOnDOMLoaded(imagesOnDOMLoad);

        loadImagesOnLoaded(imagesOnLoad);
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

//Loads all images manually (load,dom,manual, etc.)
export function loadManualImages(container = document) {
    console.debug('loadManualImages', container);
    const imageEls = container.querySelectorAll('[loading="lazy"]');

    setImageSourceArray(imageEls);
}

afterCallstack(initLazyImages);
document.addEventListener('DOMContentLoaded', initLazyImages);

document.addEventListener('shopify:section:load', () => afterCallstack(initLazyImages));
