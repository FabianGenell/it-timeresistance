/**
 * @typedef {Object} VideoState
 * @property {boolean} isMuted - Whether the video is muted
 * @property {boolean} isPlaying - Whether the video is playing
 * @property {ResizeObserver|null} resizeObserver - Resize observer instance
 * @property {string|null} currentSource - Current video source URL
 * @property {boolean} autoplayAttempted - Whether autoplay has been attempted
 * @property {'dom'|'load'|'manual'|null} lazyType - When to load the video
 * @property {boolean} isLoaded - Whether the video source has been loaded
 * @property {boolean} isEnabled - Whether the component is functioning properly
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

import { afterCallstack } from '../utils/utils.js';

// Constants
const LOAD_TYPES = {
    DOM: 'dom',
    LOAD: 'load',
    MANUAL: 'manual'
};

const VIDEO_ERROR_CODES = {
    MEDIA_ERR_ABORTED: 1,
    MEDIA_ERR_NETWORK: 2,
    MEDIA_ERR_DECODE: 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED: 4
};

const SELECTORS = {
    VIDEO: 'video',
    SOURCE: 'source',
    RESPONSIVE_VIDEO_WRAPPER: '.responsive-video-wrapper',
    POSTER_IMAGE: '.poster-image',
    PLAY_TOGGLE: '[data-play-toggle]',
    SOUND_TOGGLE: '[data-sound-toggle]',
    ICON_PLAY: '[data-icon-play]',
    ICON_SOUND_ON: '[data-icon-sound-on]',
    ICON_SOUND_OFF: '[data-icon-sound-off]'
};

class ResponsiveVideo extends HTMLElement {
    /** @type {VideoState} */
    state = {
        isMuted: true,
        isPlaying: false,
        resizeObserver: null,
        currentSource: null,
        autoplayAttempted: false,
        lazyType: null,
        isLoaded: false,
        isEnabled: true
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
        try {
            // Initialize state
            this.state.lazyType = this.getLoadType();

            this.setupElements();
            this.bindEvents();
            this.setupObservers();
            this.handleLoadType();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to initialize component:', error);
            this.state.isEnabled = false;
        }
    }

    /**
     * Gets the load type from attributes
     * @returns {'dom'|'load'|'manual'|null}
     */
    getLoadType() {
        try {
            const type = this.getAttribute('data-lazy-type');
            if (Object.values(LOAD_TYPES).includes(type)) {
                return type;
            }
            return null;
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to get load type:', error);
            return null;
        }
    }

    /**
     * Checks if autoplay is enabled
     * @returns {boolean}
     */
    get autoplay() {
        try {
            return this.hasAttribute('autoplay') || this.hasAttribute('data-autoplay');
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to check autoplay attribute:', error);
            return false;
        }
    }

    /**
     * Sets up DOM element references
     */
    setupElements() {
        if (!this.state.isEnabled) return;

        try {
            this.elements.videoWrapper = this.querySelector(SELECTORS.RESPONSIVE_VIDEO_WRAPPER) || this;
            this.elements.video = this.querySelector(SELECTORS.VIDEO);
            this.elements.posterImage = this.querySelector(SELECTORS.POSTER_IMAGE);
            this.elements.playButton = this.querySelector(SELECTORS.PLAY_TOGGLE);
            this.elements.soundButton = this.querySelector(SELECTORS.SOUND_TOGGLE);
            this.elements.playIcon = this.querySelector(SELECTORS.ICON_PLAY);
            this.elements.soundOnIcon = this.querySelector(SELECTORS.ICON_SOUND_ON);
            this.elements.soundOffIcon = this.querySelector(SELECTORS.ICON_SOUND_OFF);

            if (this.elements.video) {
                try {
                    this.elements.sources = Array.from(
                        this.elements.video.querySelectorAll(SELECTORS.SOURCE)
                    );

                    // Set initial video state
                    if (this.autoplay) {
                        this.elements.video.dataset.autoplay = 'true';
                        this.elements.video.muted = true;
                    }

                    console.log('this.state.lazyType', this.state.lazyType);

                    // For deferred loading, remove src attributes to prevent loading
                    if (this.state.lazyType && this.state.lazyType !== null) {
                        this.deferVideoSources();
                    }

                    // Initially hide video until loaded
                    this.elements.video.style.opacity = '0';
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to setup video element:', error);
                }
            } else {
                console.warn('[ResponsiveVideo] No video element found');
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to setup elements:', error);
            this.state.isEnabled = false;
        }
    }

    /**
     * Defers video sources by storing them and removing src attributes
     */
    deferVideoSources() {
        if (!this.elements.video || !this.state.isEnabled) return;
        console.log('deferVideoSources');

        try {
            // Store original sources for later restoration
            this.originalSources = [];

            // Handle video src attribute
            if (this.elements.video.src) {
                this.originalVideoSrc = this.elements.video.src;
                this.elements.video.removeAttribute('src');
            }

            // Handle poster attribute
            if (this.elements.video.poster) {
                this.originalPoster = this.elements.video.poster;
                this.elements.video.removeAttribute('poster');
            }

            // Handle source elements
            this.elements.sources.forEach((source) => {
                try {
                    if (source.src) {
                        this.originalSources.push({
                            element: source,
                            src: source.src,
                            media: source.getAttribute('media')
                        });
                        source.removeAttribute('src');
                    }
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to defer source:', error);
                }
            });

            // Clear video load to prevent any loading
            if (this.elements.video.load) {
                this.elements.video.load();
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to defer video sources:', error);
        }
    }

    /**
     * Restores video sources from stored originals
     */
    restoreVideoSources() {
        if (!this.elements.video || !this.state.isEnabled) return;

        try {
            // Restore video src
            if (this.originalVideoSrc) {
                this.elements.video.src = this.originalVideoSrc;
            }

            // Restore poster
            if (this.originalPoster) {
                this.elements.video.poster = this.originalPoster;
            }

            // Restore source elements
            if (this.originalSources) {
                this.originalSources.forEach((sourceData) => {
                    try {
                        sourceData.element.src = sourceData.src;
                    } catch (error) {
                        console.warn('[ResponsiveVideo] Failed to restore individual source:', error);
                    }
                });
            }

            // Reload video with restored sources
            this.elements.video.load();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to restore video sources:', error);
        }
    }

    /**
     * Gets the currently active source based on viewport
     * @returns {HTMLSourceElement|null}
     */
    getActiveSource() {
        if (!this.elements.video || !this.elements.sources.length || !this.state.isEnabled) {
            console.warn('[ResponsiveVideo] Cannot get active source - video or sources missing');
            return null;
        }

        try {
            const viewportWidth = window.innerWidth;

            // Check mobile source (max-width)
            const mobileSource = this.elements.sources.find((source) => {
                try {
                    const media = source.getAttribute('media');
                    if (!media || !media.includes('max-width')) return false;

                    const maxWidthMatch = media.match(/\d+/);
                    if (!maxWidthMatch) return false;

                    return viewportWidth <= parseInt(maxWidthMatch[0]);
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to check mobile source:', error);
                    return false;
                }
            });

            if (mobileSource) return mobileSource;

            // Check large source (min-width)
            const largeSource = this.elements.sources.find((source) => {
                try {
                    const media = source.getAttribute('media');
                    if (!media || !media.includes('min-width')) return false;

                    const minWidthMatch = media.match(/\d+/);
                    if (!minWidthMatch) return false;

                    return viewportWidth >= parseInt(minWidthMatch[0]);
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to check large source:', error);
                    return false;
                }
            });

            if (largeSource) return largeSource;

            // Default source (no media attribute)
            return (
                this.elements.sources.find((source) => !source.hasAttribute('media')) ||
                this.elements.sources[0]
            );
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to get active source:', error);
            return this.elements.sources[0] || null;
        }
    }

    /**
     * Binds event listeners
     */
    bindEvents() {
        if (!this.state.isEnabled) return;

        try {
            // Video wrapper click handler
            if (this.elements.videoWrapper) {
                this.elements.videoWrapper.addEventListener('click', this.handleWrapperClick.bind(this));
            }

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
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to bind events:', error);
        }
    }

    /**
     * Handles wrapper click events
     * @param {Event} e
     */
    handleWrapperClick(e) {
        if (!this.state.isEnabled) return;

        try {
            // Ignore clicks on sound button
            if (e.target.closest(SELECTORS.SOUND_TOGGLE)) {
                return;
            }

            this.togglePlay();
            e.preventDefault();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle wrapper click:', error);
        }
    }

    /**
     * Handles video play event
     */
    handleVideoPlay() {
        try {
            this.state.isPlaying = true;
            this.updateControlsUI();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video play event:', error);
        }
    }

    /**
     * Handles video pause event
     */
    handleVideoPause() {
        try {
            this.state.isPlaying = false;
            this.updateControlsUI();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video pause event:', error);
        }
    }

    /**
     * Handles video canplay event
     */
    handleVideoCanPlay() {
        try {
            this.handleVideoLoaded();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video canplay event:', error);
        }
    }

    /**
     * Handles video loadeddata event
     */
    handleVideoLoadedData() {
        try {
            if (this.autoplay && !this.state.autoplayAttempted) {
                this.attemptAutoplay();
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video loadeddata event:', error);
        }
    }

    /**
     * Handles video error event
     * @param {Event} e
     */
    handleVideoError(e) {
        try {
            const videoError = this.elements.video?.error;

            // Ignore "Empty src attribute" errors when using deferred loading
            // This is expected behavior when sources are intentionally removed
            if (
                this.state.lazyType &&
                videoError?.code === VIDEO_ERROR_CODES.MEDIA_ERR_SRC_NOT_SUPPORTED &&
                videoError?.message?.includes('Empty src attribute')
            ) {
                return;
            }

            // Handle specific HLS errors more gracefully
            if (videoError?.message?.includes('HLS') || videoError?.message?.includes('DEMUXER_ERROR')) {
                console.warn(
                    '[ResponsiveVideo] HLS format not supported by this browser. Consider using MP4 format only.'
                );
                return;
            }

            console.warn('[ResponsiveVideo] Video error:', e, videoError);
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video error event:', error);
        }
    }

    /**
     * Handles when video is loaded and ready
     */
    handleVideoLoaded() {
        if (!this.state.isEnabled) return;

        try {
            if (this.elements.posterImage) {
                this.elements.posterImage.style.opacity = '0';
            }

            if (this.elements.video) {
                this.elements.video.style.opacity = '1';
            }

            if (this.autoplay && !this.state.autoplayAttempted) {
                this.attemptAutoplay();
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle video loaded:', error);
        }
    }

    /**
     * Attempts to autoplay the video
     */
    async attemptAutoplay() {
        if (!this.elements.video || !this.state.isEnabled) return;

        try {
            this.state.autoplayAttempted = true;

            if (!this.isElementVisible()) return;

            this.elements.video.muted = true;

            try {
                await new Promise((resolve) => setTimeout(resolve, 100));
                await this.elements.video.play();
                this.state.isPlaying = true;
                this.updateControlsUI();
            } catch (error) {
                console.warn('[ResponsiveVideo] Autoplay failed:', error);

                // Retry once after delay
                try {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    await this.elements.video.play();
                    this.state.isPlaying = true;
                    this.updateControlsUI();
                } catch (retryError) {
                    console.warn('[ResponsiveVideo] Autoplay retry failed:', retryError);
                }
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to attempt autoplay:', error);
        }
    }

    /**
     * Checks if element is visible in viewport
     * @returns {boolean}
     */
    isElementVisible() {
        try {
            const rect = this.getBoundingClientRect();
            return (
                rect.top < window.innerHeight &&
                rect.bottom > 0 &&
                rect.left < window.innerWidth &&
                rect.right > 0
            );
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to check element visibility:', error);
            return false;
        }
    }

    /**
     * Sets up observers for resize and viewport
     */
    setupObservers() {
        if (!this.state.isEnabled) return;

        try {
            if ('ResizeObserver' in window) {
                this.state.resizeObserver = new ResizeObserver(() => {
                    try {
                        this.handleResize();
                    } catch (error) {
                        console.warn('[ResponsiveVideo] Failed to handle resize in observer:', error);
                    }
                });
                this.state.resizeObserver.observe(document.documentElement);
            } else {
                window.addEventListener('resize', this.handleResize.bind(this));
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to setup observers:', error);
            // Fallback to window resize event
            try {
                window.addEventListener('resize', this.handleResize.bind(this));
            } catch (fallbackError) {
                console.warn('[ResponsiveVideo] Failed to setup fallback resize listener:', fallbackError);
            }
        }
    }

    /**
     * Handles resize events
     */
    handleResize() {
        if (!this.state.isEnabled) return;

        try {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                try {
                    this.updateSourceBasedOnViewport();
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to update source on resize:', error);
                }
            }, 150);
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle resize:', error);
        }
    }

    /**
     * Handles load type behavior
     */
    handleLoadType() {
        if (!this.state.isEnabled) return;

        try {
            switch (this.state.lazyType) {
                case LOAD_TYPES.DOM:
                    this.loadOnDOMReady();
                    break;
                case LOAD_TYPES.LOAD:
                    this.loadOnWindowLoad();
                    break;
                case LOAD_TYPES.MANUAL:
                    // Don't load automatically
                    break;
                default:
                    this.setInitialSource();
                    break;
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to handle load type:', error);
            // Fallback to setting initial source
            try {
                this.setInitialSource();
            } catch (fallbackError) {
                console.warn('[ResponsiveVideo] Failed to set initial source as fallback:', fallbackError);
            }
        }
    }

    /**
     * Loads video when DOM is ready
     */
    loadOnDOMReady() {
        if (!this.state.isEnabled) return;

        try {
            const execute = () => {
                try {
                    afterCallstack(() => this.setInitialSource());
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to execute DOM ready callback:', error);
                }
            };

            if (document.readyState !== 'loading') {
                return execute();
            }

            document.addEventListener('DOMContentLoaded', execute);
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to setup DOM ready loading:', error);
        }
    }

    /**
     * Loads video when window loads
     */
    loadOnWindowLoad() {
        if (!this.state.isEnabled) return;

        try {
            const execute = () => {
                try {
                    afterCallstack(() => this.setInitialSource());
                } catch (error) {
                    console.warn('[ResponsiveVideo] Failed to execute window load callback:', error);
                }
            };

            if (document.readyState === 'complete') {
                return execute();
            }

            window.addEventListener('load', execute);
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to setup window load loading:', error);
        }
    }

    /**
     * Sets the initial video source
     */
    setInitialSource() {
        if (this.state.isLoaded || !this.state.isEnabled) return;

        try {
            // If sources were deferred, restore them first
            if (this.originalSources || this.originalVideoSrc) {
                this.restoreVideoSources();
            }

            const activeSource = this.getActiveSource();
            if (!activeSource || !this.elements.video) {
                console.warn('[ResponsiveVideo] Cannot set initial source - activeSource or video missing');
                return;
            }

            this.elements.video.src = activeSource.src;
            this.state.currentSource = activeSource.src;
            this.state.isLoaded = true;

            this.elements.video.load();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to set initial source:', error);
        }
    }

    /**
     * Updates video source based on viewport changes
     */
    async updateSourceBasedOnViewport() {
        if (!this.state.isEnabled) return;

        try {
            const activeSource = this.getActiveSource();
            if (!activeSource || !this.elements.video) {
                console.warn('[ResponsiveVideo] Cannot update source - activeSource or video missing');
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
                    console.warn('[ResponsiveVideo] Error playing video after source change:', error);
                }
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to update source based on viewport:', error);
        }
    }

    /**
     * Toggles video play/pause
     */
    async togglePlay() {
        if (!this.elements.video || !this.state.isEnabled) {
            console.warn('[ResponsiveVideo] Cannot toggle play - video missing or component disabled');
            return;
        }

        try {
            if (this.elements.video.paused) {
                // Ensure source is set
                if (!this.elements.video.src) {
                    const activeSource = this.getActiveSource();
                    if (activeSource) {
                        this.elements.video.src = activeSource.src;
                        this.elements.video.load();
                    } else {
                        console.warn('[ResponsiveVideo] No source available to play');
                        return;
                    }
                }

                try {
                    await this.elements.video.play();
                    this.state.isPlaying = true;
                } catch (error) {
                    console.warn('[ResponsiveVideo] Error playing video:', error);
                }
            } else {
                this.elements.video.pause();
                this.state.isPlaying = false;
            }

            this.updateControlsUI();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to toggle play:', error);
        }
    }

    /**
     * Toggles video sound
     */
    toggleSound() {
        if (!this.elements.video || !this.state.isEnabled) {
            console.warn('[ResponsiveVideo] Cannot toggle sound - video missing or component disabled');
            return;
        }

        try {
            this.elements.video.muted = !this.elements.video.muted;
            this.state.isMuted = this.elements.video.muted;

            this.updateControlsUI();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to toggle sound:', error);
        }
    }

    /**
     * Updates UI controls based on state
     */
    updateControlsUI() {
        if (!this.state.isEnabled) return;

        try {
            // Update play icon visibility
            if (this.elements.playIcon && this.elements.video) {
                this.elements.playIcon.classList.toggle('hidden', !this.elements.video.paused);
            }

            // Update sound icons
            if (this.elements.soundOnIcon && this.elements.soundOffIcon && this.elements.video) {
                this.elements.soundOnIcon.classList.toggle('hidden', this.elements.video.muted);
                this.elements.soundOffIcon.classList.toggle('hidden', !this.elements.video.muted);
            }
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to update controls UI:', error);
        }
    }

    /**
     * Cleanup when element is removed
     */
    disconnectedCallback() {
        try {
            this.destroy();
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to cleanup on disconnect:', error);
        }
    }

    /**
     * Destroys the component and cleans up
     */
    destroy() {
        try {
            // Clear resize timeout
            if (this.resizeTimeout) {
                clearTimeout(this.resizeTimeout);
            }

            // Remove event listeners
            try {
                this.elements.videoWrapper?.removeEventListener('click', this.handleWrapperClick);
                this.elements.soundButton?.removeEventListener('click', this.toggleSound);

                if (this.elements.video) {
                    this.elements.video.removeEventListener('play', this.handleVideoPlay);
                    this.elements.video.removeEventListener('pause', this.handleVideoPause);
                    this.elements.video.removeEventListener('canplay', this.handleVideoCanPlay);
                    this.elements.video.removeEventListener('loadeddata', this.handleVideoLoadedData);
                    this.elements.video.removeEventListener('error', this.handleVideoError);
                }
            } catch (error) {
                console.warn('[ResponsiveVideo] Failed to remove event listeners:', error);
            }

            // Disconnect observers
            try {
                if (this.state.resizeObserver) {
                    this.state.resizeObserver.disconnect();
                } else {
                    window.removeEventListener('resize', this.handleResize);
                }
            } catch (error) {
                console.warn('[ResponsiveVideo] Failed to disconnect observers:', error);
            }

            this.state.isEnabled = false;
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to destroy component:', error);
        }
    }
}

// Define custom element with error handling
try {
    if (!customElements.get('responsive-video')) {
        customElements.define('responsive-video', ResponsiveVideo);
    }
} catch (error) {
    console.warn('[ResponsiveVideo] Failed to define custom element:', error);
}

/**
 * Manually load videos with data-load-type="manual"
 * @param {HTMLElement|Document} container - Container to search within
 */
export function loadManualVideos(container = document) {
    try {
        const manualVideos = container.querySelectorAll('responsive-video[data-load-type="manual"]');
        manualVideos.forEach((video) => {
            try {
                if (video instanceof ResponsiveVideo && !video.state?.isLoaded) {
                    video.setInitialSource();
                }
            } catch (error) {
                console.warn('[ResponsiveVideo] Failed to load manual video:', error);
            }
        });
    } catch (error) {
        console.warn('[ResponsiveVideo] Failed to load manual videos:', error);
    }
}

// Module export for Shopify theme integration
export default {
    init() {
        try {
            // Custom elements are automatically initialized by the browser
            // This function just ensures backward compatibility
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to initialize module:', error);
        }
    },

    destroy() {
        try {
            // Let the disconnectedCallback handle cleanup
        } catch (error) {
            console.warn('[ResponsiveVideo] Failed to destroy module:', error);
        }
    },

    loadManualVideos
};
