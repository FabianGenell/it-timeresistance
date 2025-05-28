class VideoViewportManager {
    constructor() {
        this.timeoutDuration = 10000; // 10 seconds
        this.videoStates = new Map();
        this.observer = null;
        this.externalPlayers = new Map(); // Store YouTube/Vimeo player instances
        this.init();
    }

    init() {
        this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
            threshold: 0.5
        });

        this.observeVideos();
        this.listenForExternalPlayers();
    }

    observeVideos() {
        // Observe regular HTML5 videos
        document.querySelectorAll('video').forEach((video) => {
            this.observer.observe(video);
            this.videoStates.set(video, {
                timeoutId: null,
                type: 'html5'
            });
        });

        // Observe external video containers (YouTube/Vimeo iframes)
        document.querySelectorAll('[data-video-provider]').forEach((container) => {
            this.observer.observe(container);
            this.videoStates.set(container, {
                timeoutId: null,
                type: 'external',
                provider: container.dataset.videoProvider
            });
        });
    }

    // Listen for custom events when external players are initialized
    listenForExternalPlayers() {
        // Listen for YouTube player ready events
        window.addEventListener('youtube-player-ready', (event) => {
            const { element, player } = event.detail;

            // Store the player
            this.externalPlayers.set(element, {
                player,
                type: 'youtube'
            });

            // Start observing the iframe if not already observed
            if (!this.videoStates.has(element)) {
                this.observer.observe(element);
                this.videoStates.set(element, {
                    timeoutId: null,
                    type: 'external',
                    provider: 'youtube'
                });
            }
        });

        // Listen for Vimeo player ready events
        window.addEventListener('vimeo-player-ready', (event) => {
            const { element, player } = event.detail;

            // Store the player
            this.externalPlayers.set(element, {
                player,
                type: 'vimeo'
            });

            // Start observing the iframe if not already observed
            if (!this.videoStates.has(element)) {
                this.observer.observe(element);
                this.videoStates.set(element, {
                    timeoutId: null,
                    type: 'external',
                    provider: 'vimeo'
                });
            }
        });
    }

    handleIntersection(entries) {
        entries.forEach((entry) => {
            const element = entry.target;
            const state = this.videoStates.get(element);

            if (!state) return;

            if (state.type === 'html5') {
                this.handleHTML5Video(element, entry.isIntersecting, state);
            } else if (state.type === 'external') {
                this.handleExternalVideo(element, entry.isIntersecting, state);
            }
        });
    }

    handleHTML5Video(video, isIntersecting, state) {
        if (isIntersecting) {
            // Video is in viewport
            if (state.timeoutId) {
                clearTimeout(state.timeoutId);
                state.timeoutId = null;
            }

            if (video.dataset.autoPaused === 'true' || video.dataset.autoplay === 'true') {
                video.play();
                video.dataset.autoPaused = false;
            }
        } else {
            // Video is out of viewport
            if (!video.muted && !video.paused) {
                video.pause();
                video.dataset.autoPaused = true;

                state.timeoutId = setTimeout(() => {
                    video.dataset.autoPaused = false;
                    state.timeoutId = null;
                }, this.timeoutDuration);
            }
        }
    }

    handleExternalVideo(element, isIntersecting, state) {
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
                if (type === 'youtube') {
                    player.playVideo();
                } else if (type === 'vimeo') {
                    player.play();
                }
                element.dataset.autoPaused = false;
            }
        } else {
            // Video is out of viewport
            if (type === 'youtube') {
                // Check if video is playing (1) or buffering (3)
                const playerState = player.getPlayerState();
                if (playerState === 1 || playerState === 3) {
                    player.pauseVideo();
                    element.dataset.autoPaused = true;

                    state.timeoutId = setTimeout(() => {
                        element.dataset.autoPaused = false;
                        state.timeoutId = null;
                    }, this.timeoutDuration);
                }
            } else if (type === 'vimeo') {
                player.getPaused().then((paused) => {
                    if (!paused) {
                        player.pause();
                        element.dataset.autoPaused = true;

                        state.timeoutId = setTimeout(() => {
                            element.dataset.autoPaused = false;
                            state.timeoutId = null;
                        }, this.timeoutDuration);
                    }
                });
            }
        }
    }

    // Method to observe new videos added dynamically
    observeNewVideos() {
        let newVideosFound = 0;

        // Find and observe new HTML5 videos
        document.querySelectorAll('video').forEach((video) => {
            if (!this.videoStates.has(video)) {
                this.observer.observe(video);
                this.videoStates.set(video, {
                    timeoutId: null,
                    type: 'html5'
                });
                newVideosFound++;
            }
        });

        // Find and observe new external video containers
        document.querySelectorAll('[data-video-provider]').forEach((container) => {
            if (!this.videoStates.has(container)) {
                this.observer.observe(container);
                this.videoStates.set(container, {
                    timeoutId: null,
                    type: 'external',
                    provider: container.dataset.videoProvider
                });
                newVideosFound++;
            }
        });
    }

    destroy() {
        // Clear all timeouts
        this.videoStates.forEach((state) => {
            if (state.timeoutId) {
                clearTimeout(state.timeoutId);
            }
        });

        // Disconnect observer
        this.observer.disconnect();
        this.videoStates.clear();
        this.externalPlayers.clear();

        // Remove event listeners
        window.removeEventListener('youtube-player-ready', this.listenForExternalPlayers);
        window.removeEventListener('vimeo-player-ready', this.listenForExternalPlayers);
    }
}

// Initialize the manager
const videoManager = new VideoViewportManager();

export default videoManager;
