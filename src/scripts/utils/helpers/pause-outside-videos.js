class VideoViewportManager {
    constructor() {
        this.timeoutDuration = 10000; // 10 seconds
        this.videoStates = new Map();
        this.observer = null;
        this.init();
    }

    init() {
        this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
            threshold: 0.5
        });

        this.observeVideos();
    }

    observeVideos() {
        document.querySelectorAll('video').forEach((video) => {
            this.observer.observe(video);
            this.videoStates.set(video, {
                timeoutId: null
            });
        });
    }

    handleIntersection(entries) {
        entries.forEach((entry) => {
            const video = entry.target;
            const state = this.videoStates.get(video);

            if (!state) return;

            if (entry.isIntersecting) {
                // Video is in viewport
                if (state.timeoutId) {
                    clearTimeout(state.timeoutId);
                    state.timeoutId = null;
                }

                if (video.dataset.autoPaused === 'true') {
                    video.play();
                    video.dataset.autoPaused = false;
                }
            } else {
                // Video is out of viewport
                if (!video.muted && !video.paused) {
                    video.pause();

                    video.dataset.autoPaused = true;

                    state.timeoutId = setTimeout(() => {
                        console.log('removing autoPaused', video);
                        video.dataset.autoPaused = false;

                        state.timeoutId = null;
                    }, this.timeoutDuration);
                }
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
    }
}

// Initialize the manager
const videoManager = new VideoViewportManager();

export default videoManager;
