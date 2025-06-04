/**
 * @typedef {Object} VideoState
 * @property {boolean} isMuted - Whether the video is muted
 * @property {boolean} isPlaying - Whether the video is playing
 * @property {ResizeObserver|null} resizeObserver - Resize observer instance
 * @property {string|null} currentSource - Current video source URL
 * @property {boolean} autoplayAttempted - Whether autoplay has been attempted
 * @property {'dom'|'load'|'manual'|null} loadType - When to load the video
 * @property {boolean} isLoaded - Whether the video source has been loaded
 */

/**
 * @typedef {Object} VideoElements
 * @property {HTMLElement} videoWrapper - Video wrapper element
 * @property {HTMLVideoElement|null} video - Video element
 * @property {HTMLImageElement|null} posterImage - Poster image element
 * @property {HTMLElement|null} playButton - Play button element
 * @property {HTMLElement|null} soundButton - Sound button element
 * @property {HTMLElement|null} playIcon - Play icon element
 * @property {HTMLElement|null} soundOnIcon - Sound on icon element
 * @property {HTMLElement|null} soundOffIcon - Sound off icon element
 * @property {HTMLSourceElement[]} sources - Video source elements
 */

/**
 * Responsive Video Web Component
 * - Switches video sources based on screen size (mobile/desktop/large)
 * - Uses poster image for aspect ratio
 * - Shows video after loading, hiding the poster
 * - Pauses video when out of viewport (using VideoViewportManager)
 * - Handles play/pause and sound toggle
 * - Supports load-type attributes: 'dom', 'load', 'manual'
 */

import videoManager from '../utils/helpers/pause-outside-videos.js';
import { afterCallstack } from '../utils/utils.js';

class ResponsiveVideo extends HTMLElement {
    /** @type {VideoState} */
    state = {
        isMuted: true,
        isPlaying: false,
        resizeObserver: null,
        currentSource: null,
        autoplayAttempted: false,
        loadType: null,
        isLoaded: false
    };

    /** @type {VideoElements} */
    elements = {
        videoWrapper: this,
        video: null,
        posterImage: null,
        playButton: null,
        soundButton: null,
        playIcon: null,
        soundOnIcon: null,
        soundOffIcon: null,
        sources: []
    };

    /** @type {number|null} */
    resizeTimeout = null;

    constructor() {
        super();
    }

    connectedCallback() {
        // Initialize state
        this.state.loadType = this.getLoadType();

        this.setupElements();
        this.bindEvents();
        this.setupObservers();
        this.handleLoadType();
    }

    /**
     * Gets the load type from attributes
     * @returns {'dom'|'load'|'manual'|null}
     */
    getLoadType() {
        const type = this.getAttribute('data-load-type');
        if (type === 'dom' || type === 'load' || type === 'manual') {
            return type;
        }
        return null;
    }

    /**
     * Checks if autoplay is enabled
     * @returns {boolean}
     */
    get autoplay() {
        return this.hasAttribute('autoplay') || this.hasAttribute('data-autoplay');
    }

    /**
     * Sets up DOM element references
     */
    setupElements() {
        this.elements.videoWrapper = this.querySelector('.responsive-video-wrapper') || this;
        this.elements.video = this.querySelector('video');
        this.elements.posterImage = this.querySelector('.poster-image');
        this.elements.playButton = this.querySelector('[data-play-toggle]');
        this.elements.soundButton = this.querySelector('[data-sound-toggle]');
        this.elements.playIcon = this.querySelector('[data-icon-play]');
        this.elements.soundOnIcon = this.querySelector('[data-icon-sound-on]');
        this.elements.soundOffIcon = this.querySelector('[data-icon-sound-off]');

        if (this.elements.video) {
            this.elements.sources = Array.from(this.elements.video.querySelectorAll('source'));

            // Set initial video state
            if (this.autoplay) {
                this.elements.video.dataset.autoplay = 'true';
                this.elements.video.muted = true;
            }

            // For deferred loading, remove src attributes to prevent loading
            if (this.state.loadType && this.state.loadType !== null) {
                this.deferVideoSources();
            }

            // Initially hide video until loaded
            this.elements.video.style.opacity = '0';
        } else {
            console.error('[ResponsiveVideo] No video element found');
        }
    }

    /**
     * Defers video sources by storing them and removing src attributes
     */
    deferVideoSources() {
        if (!this.elements.video) return;

        // Store original sources for later restoration
        this.originalSources = [];

        // Handle video src attribute
        if (this.elements.video.src) {
            this.originalVideoSrc = this.elements.video.src;
            this.elements.video.removeAttribute('src');
        }

        // Handle source elements
        this.elements.sources.forEach((source) => {
            if (source.src) {
                this.originalSources.push({
                    element: source,
                    src: source.src,
                    media: source.getAttribute('media')
                });
                source.removeAttribute('src');
            }
        });

        // Clear video load to prevent any loading
        if (this.elements.video.load) {
            this.elements.video.load();
        }
    }

    /**
     * Restores video sources from stored originals
     */
    restoreVideoSources() {
        if (!this.elements.video) return;

        // Restore video src
        if (this.originalVideoSrc) {
            this.elements.video.src = this.originalVideoSrc;
        }

        // Restore source elements
        if (this.originalSources) {
            this.originalSources.forEach((sourceData) => {
                sourceData.element.src = sourceData.src;
            });
        }

        // Reload video with restored sources
        this.elements.video.load();
    }

    /**
     * Gets the currently active source based on viewport
     * @returns {HTMLSourceElement|null}
     */
    getActiveSource() {
        if (!this.elements.video || !this.elements.sources.length) {
            console.error('[ResponsiveVideo] Cannot get active source - video or sources missing');
            return null;
        }

        const viewportWidth = window.innerWidth;

        // Check mobile source (max-width)
        const mobileSource = this.elements.sources.find((source) => {
            const media = source.getAttribute('media');
            if (!media || !media.includes('max-width')) return false;

            const maxWidthMatch = media.match(/\d+/);
            if (!maxWidthMatch) return false;

            return viewportWidth <= parseInt(maxWidthMatch[0]);
        });

        if (mobileSource) return mobileSource;

        // Check large source (min-width)
        const largeSource = this.elements.sources.find((source) => {
            const media = source.getAttribute('media');
            if (!media || !media.includes('min-width')) return false;

            const minWidthMatch = media.match(/\d+/);
            if (!minWidthMatch) return false;

            return viewportWidth >= parseInt(minWidthMatch[0]);
        });

        if (largeSource) return largeSource;

        // Default source (no media attribute)
        return (
            this.elements.sources.find((source) => !source.hasAttribute('media')) || this.elements.sources[0]
        );
    }

    /**
     * Binds event listeners
     */
    bindEvents() {
        // Video wrapper click handler
        this.elements.videoWrapper.addEventListener('click', this.handleWrapperClick.bind(this));

        // Sound button click handler
        if (this.elements.soundButton) {
            this.elements.soundButton.addEventListener('click', this.toggleSound.bind(this));
        }

        // Video event handlers
        if (this.elements.video) {
            this.elements.video.addEventListener('play', this.handleVideoPlay.bind(this));
            this.elements.video.addEventListener('pause', this.handleVideoPause.bind(this));
            this.elements.video.addEventListener('canplay', this.handleVideoCanPlay.bind(this));
            this.elements.video.addEventListener('loadeddata', this.handleVideoLoadedData.bind(this));
            this.elements.video.addEventListener('error', this.handleVideoError.bind(this));
        }
    }

    /**
     * Handles wrapper click events
     * @param {Event} e
     */
    handleWrapperClick(e) {
        // Ignore clicks on sound button
        if (e.target.closest('[data-sound-toggle]')) {
            return;
        }

        this.togglePlay();
        e.preventDefault();
    }

    /**
     * Handles video play event
     */
    handleVideoPlay() {
        this.state.isPlaying = true;
        this.updateControlsUI();
    }

    /**
     * Handles video pause event
     */
    handleVideoPause() {
        this.state.isPlaying = false;
        this.updateControlsUI();
    }

    /**
     * Handles video canplay event
     */
    handleVideoCanPlay() {
        this.handleVideoLoaded();
    }

    /**
     * Handles video loadeddata event
     */
    handleVideoLoadedData() {
        if (this.autoplay && !this.state.autoplayAttempted) {
            this.attemptAutoplay();
        }
    }

    /**
     * Handles video error event
     * @param {Event} e
     */
    handleVideoError(e) {
        // Ignore "Empty src attribute" errors when using deferred loading
        // This is expected behavior when sources are intentionally removed
        if (this.state.loadType && 
            this.elements.video?.error?.code === 4 && 
            this.elements.video?.error?.message?.includes('Empty src attribute')) {
            return;
        }
        
        console.error('[ResponsiveVideo] Video error:', e, this.elements.video?.error);
    }

    /**
     * Handles when video is loaded and ready
     */
    handleVideoLoaded() {
        if (this.elements.posterImage) {
            this.elements.posterImage.style.opacity = '0';
        }

        if (this.elements.video) {
            this.elements.video.style.opacity = '1';
        }

        if (this.autoplay && !this.state.autoplayAttempted) {
            this.attemptAutoplay();
        }
    }

    /**
     * Attempts to autoplay the video
     */
    async attemptAutoplay() {
        if (!this.elements.video) return;

        this.state.autoplayAttempted = true;

        if (!this.isElementVisible()) return;

        this.elements.video.muted = true;

        try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            await this.elements.video.play();
            this.state.isPlaying = true;
            this.updateControlsUI();
        } catch (error) {
            console.error('[ResponsiveVideo] Autoplay failed:', error);

            // Retry once after delay
            try {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await this.elements.video.play();
                this.state.isPlaying = true;
                this.updateControlsUI();
            } catch (retryError) {
                console.error('[ResponsiveVideo] Autoplay retry failed:', retryError);
            }
        }
    }

    /**
     * Checks if element is visible in viewport
     * @returns {boolean}
     */
    isElementVisible() {
        const rect = this.getBoundingClientRect();
        return (
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    /**
     * Sets up observers for resize and viewport
     */
    setupObservers() {
        if ('ResizeObserver' in window) {
            this.state.resizeObserver = new ResizeObserver(() => {
                this.handleResize();
            });
            this.state.resizeObserver.observe(document.documentElement);
        } else {
            window.addEventListener('resize', this.handleResize.bind(this));
        }
    }

    /**
     * Handles resize events
     */
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.updateSourceBasedOnViewport();
        }, 150);
    }

    /**
     * Handles load type behavior
     */
    handleLoadType() {
        switch (this.state.loadType) {
            case 'dom':
                this.loadOnDOMReady();
                break;
            case 'load':
                this.loadOnWindowLoad();
                break;
            case 'manual':
                // Don't load automatically
                break;
            default:
                this.setInitialSource();
                break;
        }
    }

    /**
     * Loads video when DOM is ready
     */
    loadOnDOMReady() {
        const execute = () => afterCallstack(() => this.setInitialSource());

        if (document.readyState !== 'loading') {
            return execute();
        }

        document.addEventListener('DOMContentLoaded', execute);
    }

    /**
     * Loads video when window loads
     */
    loadOnWindowLoad() {
        const execute = () => afterCallstack(() => this.setInitialSource());

        if (document.readyState === 'complete') {
            return execute();
        }

        window.addEventListener('load', execute);
    }

    /**
     * Sets the initial video source
     */
    setInitialSource() {
        if (this.state.isLoaded) return;

        // If sources were deferred, restore them first
        if (this.originalSources || this.originalVideoSrc) {
            this.restoreVideoSources();
        }

        const activeSource = this.getActiveSource();
        if (!activeSource || !this.elements.video) {
            console.error('[ResponsiveVideo] Cannot set initial source - activeSource or video missing');
            return;
        }

        this.elements.video.src = activeSource.src;
        this.state.currentSource = activeSource.src;
        this.state.isLoaded = true;

        this.elements.video.load();
    }

    /**
     * Updates video source based on viewport changes
     */
    async updateSourceBasedOnViewport() {
        const activeSource = this.getActiveSource();
        if (!activeSource || !this.elements.video) {
            console.error('[ResponsiveVideo] Cannot update source - activeSource or video missing');
            return;
        }

        // Only update if source changed
        if (this.state.currentSource === activeSource.src) return;

        const wasPlaying = !this.elements.video.paused;

        // Update source
        this.elements.video.src = activeSource.src;
        this.state.currentSource = activeSource.src;

        // Reset visual state
        this.elements.video.style.opacity = '0';
        if (this.elements.posterImage) {
            this.elements.posterImage.style.opacity = '1';
        }

        this.elements.video.load();

        if (wasPlaying) {
            try {
                await this.elements.video.play();
            } catch (error) {
                console.error('[ResponsiveVideo] Error playing video after source change:', error);
            }
        }
    }

    /**
     * Toggles video play/pause
     */
    async togglePlay() {
        if (!this.elements.video) {
            console.error('[ResponsiveVideo] Cannot toggle play - video missing');
            return;
        }

        if (this.elements.video.paused) {
            // Ensure source is set
            if (!this.elements.video.src) {
                const activeSource = this.getActiveSource();
                if (activeSource) {
                    this.elements.video.src = activeSource.src;
                    this.elements.video.load();
                } else {
                    console.error('[ResponsiveVideo] No source available to play');
                    return;
                }
            }

            try {
                await this.elements.video.play();
                this.state.isPlaying = true;
            } catch (error) {
                console.error('[ResponsiveVideo] Error playing video:', error);
            }
        } else {
            this.elements.video.pause();
            this.state.isPlaying = false;
        }

        this.updateControlsUI();
    }

    /**
     * Toggles video sound
     */
    toggleSound() {
        if (!this.elements.video) {
            console.error('[ResponsiveVideo] Cannot toggle sound - video missing');
            return;
        }

        this.elements.video.muted = !this.elements.video.muted;
        this.state.isMuted = this.elements.video.muted;

        this.updateControlsUI();
    }

    /**
     * Updates UI controls based on state
     */
    updateControlsUI() {
        // Update play icon visibility
        if (this.elements.playIcon && this.elements.video) {
            this.elements.playIcon.classList.toggle('hidden', !this.elements.video.paused);
        }

        // Update sound icons
        if (this.elements.soundOnIcon && this.elements.soundOffIcon && this.elements.video) {
            this.elements.soundOnIcon.classList.toggle('hidden', this.elements.video.muted);
            this.elements.soundOffIcon.classList.toggle('hidden', !this.elements.video.muted);
        }
    }

    /**
     * Cleanup when element is removed
     */
    disconnectedCallback() {
        this.destroy();
    }

    /**
     * Destroys the component and cleans up
     */
    destroy() {
        // Clear resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Remove event listeners
        this.elements.videoWrapper?.removeEventListener('click', this.handleWrapperClick);
        this.elements.soundButton?.removeEventListener('click', this.toggleSound);

        if (this.elements.video) {
            this.elements.video.removeEventListener('play', this.handleVideoPlay);
            this.elements.video.removeEventListener('pause', this.handleVideoPause);
            this.elements.video.removeEventListener('canplay', this.handleVideoCanPlay);
            this.elements.video.removeEventListener('loadeddata', this.handleVideoLoadedData);
            this.elements.video.removeEventListener('error', this.handleVideoError);
        }

        // Disconnect observers
        if (this.state.resizeObserver) {
            this.state.resizeObserver.disconnect();
        } else {
            window.removeEventListener('resize', this.handleResize);
        }
    }
}

// Define custom element
if (!customElements.get('responsive-video')) {
    customElements.define('responsive-video', ResponsiveVideo);
}

/**
 * Manually load videos with data-load-type="manual"
 * @param {HTMLElement|Document} container - Container to search within
 */
export function loadManualVideos(container = document) {
    const manualVideos = container.querySelectorAll('responsive-video[data-load-type="manual"]');
    manualVideos.forEach((video) => {
        if (video instanceof ResponsiveVideo && !video.state?.isLoaded) {
            video.setInitialSource();
        }
    });
}

// Module export for Shopify theme integration
export default {
    init(container) {
        // Custom elements are automatically initialized by the browser
        // This function just ensures backward compatibility
    },

    destroy(container) {
        // Let the disconnectedCallback handle cleanup
    },

    loadManualVideos
};
