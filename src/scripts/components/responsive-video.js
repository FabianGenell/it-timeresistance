/**
 * Responsive Video Web Component
 * - Switches video sources based on screen size (mobile/desktop/large)
 * - Uses poster image for aspect ratio
 * - Shows video after loading, hiding the poster
 * - Pauses video when out of viewport (using VideoViewportManager)
 * - Handles play/pause and sound toggle
 */

import videoManager from '../utils/helpers/pause-outside-videos.js';

class ResponsiveVideo extends HTMLElement {
    constructor() {
        super();
        console.log('[ResponsiveVideo] Custom element created');
    }

    connectedCallback() {
        console.log('[ResponsiveVideo] Element connected to DOM', this);
        
        // Initial state
        this.state = {
            isMuted: true,
            isPlaying: false,
            resizeObserver: null,
            currentSource: null,
            autoplayAttempted: false
        };

        this.setupElements();
        this.bindEvents();
        this.setupObservers();
        this.setInitialSource();
    }
    
    get autoplay() {
        return this.hasAttribute('autoplay') || this.hasAttribute('data-autoplay');
    }

    setupElements() {
        // Get elements from the DOM
        this.videoWrapper = this.querySelector('.responsive-video-wrapper') || this;
        this.video = this.querySelector('video');
        this.posterImage = this.querySelector('.poster-image');
        this.playButton = this.querySelector('[data-play-toggle]');
        this.soundButton = this.querySelector('[data-sound-toggle]');
        this.playIcon = this.querySelector('[data-icon-play]');
        this.soundOnIcon = this.querySelector('[data-icon-sound-on]');
        this.soundOffIcon = this.querySelector('[data-icon-sound-off]');

        // Set autoplay attribute on video element if needed
        if (this.autoplay && this.video) {
            // We don't set the autoplay attribute directly because browsers block it
            // Instead we'll manually call play() after loading
            this.video.muted = true; // Must be muted for autoplay to work
        }

        // Get video sources
        this.sources = Array.from(this.video?.querySelectorAll('source') || []);
        console.log('[ResponsiveVideo] Found video sources:', this.sources.length);
        
        // Log all sources for debugging
        this.sources.forEach((source, index) => {
            const media = source.getAttribute('media') || 'default';
            console.log(`[ResponsiveVideo] Source ${index}:`, {
                src: source.src,
                media: media,
                type: source.type
            });
        });
        
        // Initially hide video until loaded
        if (this.video) {
            this.video.style.opacity = '0';
        } else {
            console.error('[ResponsiveVideo] No video element found');
        }
    }

    getActiveSource() {
        if (!this.video || !this.sources.length) {
            console.error('[ResponsiveVideo] Cannot get active source - video or sources missing');
            return null;
        }

        // Check which media query is currently active
        const viewportWidth = window.innerWidth;
        console.log('[ResponsiveVideo] Current viewport width:', viewportWidth);

        // Mobile source: max-width media query
        const mobileSource = this.sources.find(source => {
            const media = source.getAttribute('media');
            if (!media || !media.includes('max-width')) return false;
            
            const match = media.match(/\d+/);
            if (!match) return false;
            
            const maxWidth = parseInt(match[0]);
            const isActive = viewportWidth <= maxWidth;
            console.log(`[ResponsiveVideo] Checking mobile source (max-width: ${maxWidth}px): ${isActive}`);
            return isActive;
        });
        
        if (mobileSource) {
            console.log('[ResponsiveVideo] Using mobile source:', mobileSource.src);
            return mobileSource;
        }

        // Large source: min-width media query
        const largeSource = this.sources.find(source => {
            const media = source.getAttribute('media');
            if (!media || !media.includes('min-width')) return false;
            
            const match = media.match(/\d+/);
            if (!match) return false;
            
            const minWidth = parseInt(match[0]);
            const isActive = viewportWidth >= minWidth;
            console.log(`[ResponsiveVideo] Checking large source (min-width: ${minWidth}px): ${isActive}`);
            return isActive;
        });
        
        if (largeSource) {
            console.log('[ResponsiveVideo] Using large source:', largeSource.src);
            return largeSource;
        }

        // If no media query matches, use the default source (without media attribute)
        const defaultSource = this.sources.find((source) => !source.hasAttribute('media')) || this.sources[0];
        console.log('[ResponsiveVideo] Using default source:', defaultSource.src);
        return defaultSource;
    }

    bindEvents() {
        // Make the whole video area clickable for play/pause
        this.videoWrapper.addEventListener('click', (e) => {
            // Ignore clicks on the sound button
            if (e.target.closest('[data-sound-toggle]')) {
                return;
            }
            
            this.togglePlay();
            e.preventDefault();
        });
        
        console.log('[ResponsiveVideo] Video wrapper click event bound');
        
        if (this.soundButton) {
            this.soundButton.addEventListener('click', this.toggleSound.bind(this));
            console.log('[ResponsiveVideo] Sound button event bound');
        }

        // Update control display when video state changes
        if (this.video) {
            console.log('[ResponsiveVideo] Binding video events');
            
            this.video.addEventListener('play', () => {
                console.log('[ResponsiveVideo] Video play event');
                this.state.isPlaying = true;
                this.updateControlsUI();
            });
            
            this.video.addEventListener('pause', () => {
                console.log('[ResponsiveVideo] Video pause event');
                this.state.isPlaying = false;
                this.updateControlsUI();
            });

            // When video is loaded, show it and hide poster
            this.video.addEventListener('canplay', () => {
                console.log('[ResponsiveVideo] Video canplay event');
                this.handleVideoLoaded();
            });
            
            // Loading events
            this.video.addEventListener('loadstart', () => {
                console.log('[ResponsiveVideo] Video loadstart event');
            });
            
            this.video.addEventListener('loadeddata', () => {
                console.log('[ResponsiveVideo] Video loadeddata event');
                // Try to autoplay right after data is loaded
                if (this.autoplay && !this.state.autoplayAttempted) {
                    this.attemptAutoplay();
                }
            });
            
            // Monitor errors
            this.video.addEventListener('error', (e) => {
                console.error('[ResponsiveVideo] Video error:', e, this.video.error);
            });
        }
    }

    handleVideoLoaded() {
        console.log('[ResponsiveVideo] Video loaded and can play');
        if (this.posterImage) {
            this.posterImage.style.opacity = '0';
            console.log('[ResponsiveVideo] Hiding poster image');
        } else {
            console.log('[ResponsiveVideo] No poster image found');
        }
        this.video.style.opacity = '1';
        
        // Try autoplay if we're set to autoplay and haven't tried yet
        if (this.autoplay && !this.state.autoplayAttempted) {
            this.attemptAutoplay();
        }
    }
    
    attemptAutoplay() {
        if (!this.video) return;
        
        // Mark that we've attempted autoplay to avoid multiple attempts
        this.state.autoplayAttempted = true;
        
        console.log('[ResponsiveVideo] Attempting autoplay');
        
        // Check if element is visible
        const isVisible = this.isElementVisible();
        
        if (isVisible) {
            console.log('[ResponsiveVideo] Element is visible, playing video');
            this.video.muted = true; // Must be muted for autoplay to work
            
            // Set timeout to ensure the video is ready to play
            setTimeout(() => {
                this.video.play()
                    .then(() => {
                        console.log('[ResponsiveVideo] Autoplay started successfully');
                        this.state.isPlaying = true;
                        this.updateControlsUI();
                    })
                    .catch(e => {
                        console.error('[ResponsiveVideo] Autoplay failed:', e);
                        
                        // One more retry with a longer delay
                        setTimeout(() => {
                            console.log('[ResponsiveVideo] Retrying autoplay...');
                            this.video.play()
                                .then(() => {
                                    console.log('[ResponsiveVideo] Autoplay retry successful');
                                    this.state.isPlaying = true;
                                    this.updateControlsUI();
                                })
                                .catch(e => console.error('[ResponsiveVideo] Autoplay retry failed:', e));
                        }, 1000);
                    });
            }, 100);
        } else {
            console.log('[ResponsiveVideo] Element not visible, skipping autoplay');
        }
    }
    
    isElementVisible() {
        // Simple visibility check
        const rect = this.getBoundingClientRect();
        
        // Element is at least partially visible in the viewport
        const isPartiallyVisible = 
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0;
            
        console.log('[ResponsiveVideo] Element visibility check:', isPartiallyVisible);
        return isPartiallyVisible;
    }

    setupObservers() {
        // We're using videoManager from pause-outside-videos.js for pausing when out of viewport
        // No need to set up our own intersection observer
        
        // Resize observer for source updates based on viewport
        if ('ResizeObserver' in window) {
            this.state.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
            this.state.resizeObserver.observe(document.documentElement);
            console.log('[ResponsiveVideo] Resize observer set up');
        } else {
            // Fallback to window resize event
            window.addEventListener('resize', this.handleResize.bind(this));
            console.log('[ResponsiveVideo] Window resize event fallback set up');
        }
    }

    handleResize() {
        // Delay resize handling to avoid too many updates during resize
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            console.log('[ResponsiveVideo] Window resized, updating source');
            this.updateSourceBasedOnViewport();
        }, 150);
    }
    
    setInitialSource() {
        const activeSource = this.getActiveSource();
        if (!activeSource || !this.video) {
            console.error('[ResponsiveVideo] Cannot set initial source - activeSource or video missing');
            return;
        }
        
        // Direct setup - do not use source tags with multiple files
        // Set src directly on video element
        console.log('[ResponsiveVideo] Setting initial source to:', activeSource.src);
        this.video.src = activeSource.src;
        this.state.currentSource = activeSource.src;
        
        // Force video to load without autoplay
        console.log('[ResponsiveVideo] Loading video');
        this.video.load();
    }
    
    updateSourceBasedOnViewport() {
        // Update src when window size changes (which may change active source)
        const activeSource = this.getActiveSource();
        if (!activeSource || !this.video) {
            console.error('[ResponsiveVideo] Cannot update source - activeSource or video missing');
            return;
        }
        
        // Only update if source has changed
        if (this.state.currentSource !== activeSource.src) {
            console.log('[ResponsiveVideo] Source changing from', this.state.currentSource, 'to', activeSource.src);
            
            // Remember current play state
            const wasPlaying = !this.video.paused;
            console.log('[ResponsiveVideo] Video was playing:', wasPlaying);
            
            // Set new source directly on video tag
            this.video.src = activeSource.src;
            this.state.currentSource = activeSource.src;
            
            // Reset video opacity until it's ready to play
            this.video.style.opacity = '0';
            if (this.posterImage) {
                this.posterImage.style.opacity = '1';
                console.log('[ResponsiveVideo] Showing poster image while loading new source');
            }
            
            // Force reload of the video
            console.log('[ResponsiveVideo] Loading new video source');
            this.video.load();
            
            if (wasPlaying) {
                console.log('[ResponsiveVideo] Restoring playback after source change');
                this.video.play().catch(e => 
                    console.error('[ResponsiveVideo] Error playing video after source change:', e)
                );
            }
        } else {
            console.log('[ResponsiveVideo] Source unchanged, no update needed');
        }
    }

    togglePlay() {
        if (!this.video) {
            console.error('[ResponsiveVideo] Cannot toggle play - video missing');
            return;
        }

        if (this.video.paused) {
            // Make sure we have a source set
            if (!this.video.src) {
                const activeSource = this.getActiveSource();
                if (activeSource) {
                    console.log('[ResponsiveVideo] Setting missing source before playing:', activeSource.src);
                    this.video.src = activeSource.src;
                    this.video.load();
                } else {
                    console.error('[ResponsiveVideo] No source available to play');
                    return;
                }
            }
            
            console.log('[ResponsiveVideo] Playing video');
            this.video.play().catch((e) => console.error('[ResponsiveVideo] Error playing video:', e));
            this.state.isPlaying = true;
        } else {
            console.log('[ResponsiveVideo] Pausing video');
            this.video.pause();
            this.state.isPlaying = false;
        }

        this.updateControlsUI();
    }

    toggleSound() {
        if (!this.video) {
            console.error('[ResponsiveVideo] Cannot toggle sound - video missing');
            return;
        }

        this.video.muted = !this.video.muted;
        this.state.isMuted = this.video.muted;
        console.log('[ResponsiveVideo] Toggle sound, muted:', this.video.muted);

        this.updateControlsUI();
    }

    updateControlsUI() {
        console.log('[ResponsiveVideo] Updating UI controls');
        
        // Update play button visibility - only show when paused
        if (this.playIcon && this.video) {
            if (this.video.paused) {
                this.playIcon.classList.remove('hidden');
                console.log('[ResponsiveVideo] Showing play icon');
            } else {
                this.playIcon.classList.add('hidden');
                console.log('[ResponsiveVideo] Hiding play icon');
            }
        }

        // Update sound button
        if (this.soundOnIcon && this.soundOffIcon && this.video) {
            if (this.video.muted) {
                this.soundOnIcon.classList.add('hidden');
                this.soundOffIcon.classList.remove('hidden');
                console.log('[ResponsiveVideo] Showing sound off icon');
            } else {
                this.soundOnIcon.classList.remove('hidden');
                this.soundOffIcon.classList.add('hidden');
                console.log('[ResponsiveVideo] Showing sound on icon');
            }
        }
    }

    disconnectedCallback() {
        console.log('[ResponsiveVideo] Element disconnected from DOM');
        this.destroy();
    }

    destroy() {
        console.log('[ResponsiveVideo] Destroying video component');
        
        // Clear any pending resize timeout
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        // Remove event listeners
        if (this.videoWrapper) {
            this.videoWrapper.removeEventListener('click', this.togglePlay);
        }

        if (this.soundButton) {
            this.soundButton.removeEventListener('click', this.toggleSound);
        }

        if (this.video) {
            this.video.removeEventListener('play', this.updateControlsUI);
            this.video.removeEventListener('pause', this.updateControlsUI);
            this.video.removeEventListener('canplay', this.handleVideoLoaded);
            this.video.removeEventListener('loadstart', this.handleLoadStart);
            this.video.removeEventListener('loadeddata', this.handleLoadedData);
            this.video.removeEventListener('error', this.handleVideoError);
        }

        // Disconnect resize observer
        if (this.state && this.state.resizeObserver) {
            this.state.resizeObserver.disconnect();
        } else {
            window.removeEventListener('resize', this.handleResize);
        }

        // We don't need to disconnect the video manager's observer
        // It's a global singleton that manages all videos
    }
}

// Define the custom element
if (!customElements.get('responsive-video')) {
    customElements.define('responsive-video', ResponsiveVideo);
    console.log('[ResponsiveVideo] Custom element defined');
}

// Module export for Shopify theme integration
export default {
    init(container) {
        console.log('[ResponsiveVideo] Initializing module in container', container);
        // Custom elements are automatically initialized by the browser
        // This function just ensures backward compatibility
    },

    destroy(container) {
        console.log('[ResponsiveVideo] Destroying module in container', container);
        // Let the disconnectedCallback handle cleanup
    }
};