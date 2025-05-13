const { icons: icons$1 } = window.theme;
/**
 * Initializes a PhotoSwipe lightbox for custom media.
 * Requires PhotoSwipe modules via dynamic import (`flu.chunks.photoswipe`),
 * an icons object (`icons$1`), and specific data attributes on '.lightbox-image' elements.
 * Assumes a DOM query function `t$2` exists globally or is imported.
 */
export async function customLightbox({ childSelector, galerySelector, mainClass, addListener = false }) {
    const lightboxElements = document.querySelectorAll(childSelector);
    if (!lightboxElements.length) {
        return;
    }

    const createDataSourceItem = (element) => {
        const type = element.dataset.pswpType || 'image';
        const width = parseInt(element.dataset.pswpWidth, 10);
        const height = parseInt(element.dataset.pswpHeight, 10);

        if (isNaN(width) || isNaN(height)) {
            console.warn('Lightbox element missing valid width/height data attributes:', element);
        }

        const itemData = {
            type,
            width: width || 0,
            height: height || 0,
            element // Store element reference for later use (e.g., video source)
        };

        if (type === 'video') {
            return itemData; // Video src retrieved later in contentLoad
        } else {
            itemData.src = element.getAttribute('href') || element.dataset.pswpSrc;
            if (!itemData.src) {
                console.warn('Image lightbox element missing href and data-pswp-src:', element);
            }
            return itemData;
        }
    };

    const dataSource = Array.from(lightboxElements).map(createDataSourceItem);

    const pswpModule = await import(window.flu.chunks.photoswipe); // Assumed path to PhotoSwipe module

    const { PhotoSwipeLightbox, PhotoSwipe } = pswpModule;

    if (!PhotoSwipeLightbox || !PhotoSwipe) {
        console.error('PhotoSwipe modules not found in the imported chunk.');
        return;
    }

    const lightbox = new PhotoSwipeLightbox({
        gallery: galerySelector,
        children: childSelector,
        showHideAnimationType: 'zoom',
        pswpModule: PhotoSwipe,
        mainClass,
        bgOpacity: 1,
        arrowPrevSVG: icons$1?.chevron,
        arrowNextSVG: icons$1?.chevron,
        closeSVG: icons$1?.close,
        zoomSVG: icons$1?.zoom,
        dataSource: dataSource
    });

    lightbox.on('contentLoad', (e) => {
        const { content } = e;
        const item = content.data;

        console.log('contentLoad', e, item);

        if (item.type === 'video') {
            const videoElement = item.element;
            console.log('videoElement', videoElement.dataset);
            const videoSrc = videoElement?.dataset.pswpVideo || videoElement?.getAttribute('href');

            if (videoElement && videoSrc) {
                e.preventDefault();
                content.element = createVideoElement(videoSrc);
            } else {
                console.warn(
                    `PhotoSwipe: Video item type detected, but failed to find video source on element:`,
                    videoElement
                );
                content.state = 'error';
            }
        }
    });

    lightbox.on('contentActivate', (e) => {
        const { content } = e;

        const element = content.element;
        const item = content.data;

        if (item.type === 'video') {
            console.log('contentActivate', e, content, element);
            const video = element.querySelector('video');

            if (video) {
                content.state = 'loading';
                setupVideoEvents(video, content);
            } else {
                console.error('PhotoSwipe: Failed to find video element within the created container.');
                content.state = 'error';
                content.onError();
            }
        }
    });

    lightbox.on('contentDeactivate', (e) => {
        const { content } = e;

        const element = content.element;
        const item = content.data;

        if (item.type === 'video') {
            console.log('contentDeactivate', e, content, element);
            const video = element.querySelector('video');

            if (video) {
                video.pause();
            }
        }
    });

    if (addListener) {
        lightboxElements.forEach((element, index) => {
            element.addEventListener('click', (e) => {
                console.log('opening w custom clicker listneer mate click', e);
                e.preventDefault();
                lightbox.loadAndOpen(index);
            });
        });
    }

    try {
        lightbox.init();
    } catch (initError) {
        console.error('PhotoSwipe: Failed to initialize lightbox.', initError);
    }
}

window.customLightbox = customLightbox;

const createVideoElement = (videoSrc) => {
    const container = document.createElement('div');
    container.className = 'pswp__video-wrapper';
    Object.assign(container.style, {
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#000'
    });

    const video = document.createElement('video');
    video.src = videoSrc;
    video.controls = true;

    Object.assign(video.style, {
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block'
    });

    container.appendChild(video);
    return container;
};

const setupVideoEvents = (video, content) => {
    let loaded = false;
    const onLoaded = () => {
        if (loaded) return;
        loaded = true;
        video.play();
        content.onLoaded();
    };
    const onError = (event) => {
        console.error(`PhotoSwipe: Video loading failed for src: ${video.src}`, event);
        content.onError();
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('canplay', onLoaded);
    video.addEventListener('error', onError);
    video.addEventListener('stalled', onError);

    if (video.readyState >= 3) {
        // HAVE_FUTURE_DATA or higher
        onLoaded();
    }
};
