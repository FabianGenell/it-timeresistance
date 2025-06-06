class VideoViewportManager {
    constructor() {
        this.timeoutDuration = 10000; // 10 seconds
        this.videoStates = new Map();
        this.observer = null;
        this.externalPlayers = new Map(); // Store YouTube/Vimeo player instances
        this.isEnabled = true; // Flag to disable functionality if critical errors occur

        try {
            this.init();
        } catch (error) {
            console.warn('VideoViewportManager: Failed to initialize', error);
            this.isEnabled = false;
        }
    }

    init() {
        try {
            // Check if IntersectionObserver is supported
            if (!window.IntersectionObserver) {
                console.warn('VideoViewportManager: IntersectionObserver not supported');
                this.isEnabled = false;
                return;
            }

            this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
                threshold: 0.5
            });

            this.observeVideos();
            this.listenForExternalPlayers();
        } catch (error) {
            console.warn('VideoViewportManager: Initialization failed', error);
            this.isEnabled = false;
        }
    }

    observeVideos() {
        if (!this.isEnabled || !this.observer) return;

        try {
            // Observe regular HTML5 videos
            const videos = document.querySelectorAll('video');
            videos.forEach((video) => {
                try {
                    this.observer.observe(video);
                    this.videoStates.set(video, {
                        timeoutId: null,
                        type: 'html5'
                    });
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to observe video element', error);
                }
            });

            // Observe external video containers (YouTube/Vimeo iframes)
            const containers = document.querySelectorAll('[data-video-provider]');
            containers.forEach((container) => {
                try {
                    this.observer.observe(container);
                    this.videoStates.set(container, {
                        timeoutId: null,
                        type: 'external',
                        provider: container.dataset.videoProvider
                    });
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to observe video container', error);
                }
            });
        } catch (error) {
            console.warn('VideoViewportManager: Failed to observe videos', error);
        }
    }

    // Listen for custom events when external players are initialized
    listenForExternalPlayers() {
        if (!this.isEnabled) return;

        try {
            // Listen for YouTube player ready events
            window.addEventListener('youtube-player-ready', (event) => {
                try {
                    const { element, player } = event.detail;

                    // Store the player
                    this.externalPlayers.set(element, {
                        player,
                        type: 'youtube'
                    });

                    // Start observing the iframe if not already observed
                    if (!this.videoStates.has(element) && this.observer) {
                        this.observer.observe(element);
                        this.videoStates.set(element, {
                            timeoutId: null,
                            type: 'external',
                            provider: 'youtube'
                        });
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to handle YouTube player ready event', error);
                }
            });

            // Listen for Vimeo player ready events
            window.addEventListener('vimeo-player-ready', (event) => {
                try {
                    const { element, player } = event.detail;

                    // Store the player
                    this.externalPlayers.set(element, {
                        player,
                        type: 'vimeo'
                    });

                    // Start observing the iframe if not already observed
                    if (!this.videoStates.has(element) && this.observer) {
                        this.observer.observe(element);
                        this.videoStates.set(element, {
                            timeoutId: null,
                            type: 'external',
                            provider: 'vimeo'
                        });
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to handle Vimeo player ready event', error);
                }
            });
        } catch (error) {
            console.warn('VideoViewportManager: Failed to set up external player listeners', error);
        }
    }

    handleIntersection(entries) {
        if (!this.isEnabled) return;

        try {
            entries.forEach((entry) => {
                try {
                    const element = entry.target;
                    const state = this.videoStates.get(element);

                    if (!state) return;

                    if (state.type === 'html5') {
                        this.handleHTML5Video(element, entry.isIntersecting, state);
                    } else if (state.type === 'external') {
                        this.handleExternalVideo(element, entry.isIntersecting, state);
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to handle intersection for element', error);
                }
            });
        } catch (error) {
            console.warn('VideoViewportManager: Failed to handle intersection entries', error);
        }
    }

    handleHTML5Video(video, isIntersecting, state) {
        try {
            if (isIntersecting) {
                // Video is in viewport
                if (state.timeoutId) {
                    clearTimeout(state.timeoutId);
                    state.timeoutId = null;
                }

                if (video.dataset.autoPaused === 'true' || video.dataset.autoplay === 'true') {
                    try {
                        const playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch((error) => {
                                console.warn('VideoViewportManager: Failed to play HTML5 video', error);
                            });
                        }
                        video.dataset.autoPaused = false;
                    } catch (error) {
                        console.warn('VideoViewportManager: Failed to play HTML5 video', error);
                    }
                }
            } else {
                // Video is out of viewport
                try {
                    if (!video.muted && !video.paused) {
                        video.pause();
                        video.dataset.autoPaused = true;

                        state.timeoutId = setTimeout(() => {
                            video.dataset.autoPaused = false;
                            state.timeoutId = null;
                        }, this.timeoutDuration);
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to pause HTML5 video', error);
                }
            }
        } catch (error) {
            console.warn('VideoViewportManager: Failed to handle HTML5 video', error);
        }
    }

    handleExternalVideo(element, isIntersecting, state) {
        try {
            const playerData = this.externalPlayers.get(element);
            if (!playerData) return; // Player not initialized yet

            const { player, type } = playerData;

            if (isIntersecting) {
                // Video is in viewport
                if (state.timeoutId) {
                    clearTimeout(state.timeoutId);
                    state.timeoutId = null;
                }

                if (element.dataset.autoPaused === 'true') {
                    try {
                        if (type === 'youtube' && player.playVideo) {
                            player.playVideo();
                        } else if (type === 'vimeo' && player.play) {
                            player.play().catch((error) => {
                                console.warn('VideoViewportManager: Failed to play Vimeo video', error);
                            });
                        }
                        element.dataset.autoPaused = false;
                    } catch (error) {
                        console.warn('VideoViewportManager: Failed to play external video', error);
                    }
                }
            } else {
                // Video is out of viewport
                try {
                    if (type === 'youtube') {
                        // Check if video is playing (1) or buffering (3)
                        try {
                            const playerState = player.getPlayerState ? player.getPlayerState() : null;
                            if (playerState === 1 || playerState === 3) {
                                if (player.pauseVideo) {
                                    player.pauseVideo();
                                    element.dataset.autoPaused = true;

                                    state.timeoutId = setTimeout(() => {
                                        element.dataset.autoPaused = false;
                                        state.timeoutId = null;
                                    }, this.timeoutDuration);
                                }
                            }
                        } catch (error) {
                            console.warn('VideoViewportManager: Failed to handle YouTube video state', error);
                        }
                    } else if (type === 'vimeo') {
                        try {
                            if (player.getPaused) {
                                player
                                    .getPaused()
                                    .then((paused) => {
                                        if (!paused && player.pause) {
                                            player
                                                .pause()
                                                .then(() => {
                                                    element.dataset.autoPaused = true;

                                                    state.timeoutId = setTimeout(() => {
                                                        element.dataset.autoPaused = false;
                                                        state.timeoutId = null;
                                                    }, this.timeoutDuration);
                                                })
                                                .catch((error) => {
                                                    console.warn(
                                                        'VideoViewportManager: Failed to pause Vimeo video',
                                                        error
                                                    );
                                                });
                                        }
                                    })
                                    .catch((error) => {
                                        console.warn(
                                            'VideoViewportManager: Failed to check Vimeo video state',
                                            error
                                        );
                                    });
                            }
                        } catch (error) {
                            console.warn('VideoViewportManager: Failed to handle Vimeo video', error);
                        }
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to pause external video', error);
                }
            }
        } catch (error) {
            console.warn('VideoViewportManager: Failed to handle external video', error);
        }
    }

    // Method to observe new videos added dynamically
    observeNewVideos() {
        if (!this.isEnabled || !this.observer) return;

        try {
            let newVideosFound = 0;

            // Find and observe new HTML5 videos
            const videos = document.querySelectorAll('video');
            videos.forEach((video) => {
                try {
                    if (!this.videoStates.has(video)) {
                        this.observer.observe(video);
                        this.videoStates.set(video, {
                            timeoutId: null,
                            type: 'html5'
                        });
                        newVideosFound++;
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to observe new video', error);
                }
            });

            // Find and observe new external video containers
            const containers = document.querySelectorAll('[data-video-provider]');
            containers.forEach((container) => {
                try {
                    if (!this.videoStates.has(container)) {
                        this.observer.observe(container);
                        this.videoStates.set(container, {
                            timeoutId: null,
                            type: 'external',
                            provider: container.dataset.videoProvider
                        });
                        newVideosFound++;
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to observe new container', error);
                }
            });
        } catch (error) {
            console.warn('VideoViewportManager: Failed to observe new videos', error);
        }
    }

    destroy() {
        try {
            // Clear all timeouts
            this.videoStates.forEach((state) => {
                try {
                    if (state.timeoutId) {
                        clearTimeout(state.timeoutId);
                    }
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to clear timeout', error);
                }
            });

            // Disconnect observer
            if (this.observer) {
                try {
                    this.observer.disconnect();
                } catch (error) {
                    console.warn('VideoViewportManager: Failed to disconnect observer', error);
                }
            }

            this.videoStates.clear();
            this.externalPlayers.clear();

            // Remove event listeners
            try {
                window.removeEventListener('youtube-player-ready', this.listenForExternalPlayers);
                window.removeEventListener('vimeo-player-ready', this.listenForExternalPlayers);
            } catch (error) {
                console.warn('VideoViewportManager: Failed to remove event listeners', error);
            }

            this.isEnabled = false;
        } catch (error) {
            console.warn('VideoViewportManager: Failed to destroy properly', error);
        }
    }
}

// Initialize the manager with error handling
let videoManager;
try {
    videoManager = new VideoViewportManager();
} catch (error) {
    console.warn('VideoViewportManager: Failed to create instance', error);
    // Create a fallback object that won't break if methods are called
    videoManager = {
        observeNewVideos: () => {},
        destroy: () => {},
        isEnabled: false
    };
}

export default videoManager;
