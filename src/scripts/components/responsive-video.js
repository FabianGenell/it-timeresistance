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
    SOURCES_TEMPLATE: 'template[data-sources]',
    RESPONSIVE_VIDEO_WRAPPER: '.responsive-video-wrapper',
    POSTER_IMAGE: '.poster-image',
    PLAY_TOGGLE: '[data-play-toggle]',
    SOUND_TOGGLE: '[data-sound-toggle]',
    ICON_PLAY: '[data-icon-play]',
    ICON_SOUND_ON: '[data-icon-sound-on]',
    ICON_SOUND_OFF: '[data-icon-sound-off]'
};

class ResponsiveVideo extends HTMLElement {
    constructor() {
        super();
        this.onClick = this.onClick.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onLoaded = this.onLoaded.bind(this);
    }

    connectedCallback() {
        this.lazyType = this.getAttribute('data-lazy-type');

        this.initElements();

        this.sources = this.getSources();

        this.video.style.opacity = '0';
        this.videoWrapper.addEventListener('click', this.onClick);

        this.video.addEventListener('loadeddata', this.onLoaded);

        window.addEventListener('resize', this.onResize);
        this.initVideo();
    }

    initVideo() {
        this.updateSource();

        if (this.lazyType) {
            this.video.setAttribute('data-src', this.currentSource);
        } else {
            this.load();
        }
    }

    initElements() {
        this.video = this.querySelector(SELECTORS.VIDEO);
        this.sourcesTemplate = this.querySelector(SELECTORS.SOURCES_TEMPLATE);
        if (!this.video) return;

        this.poster = this.querySelector(SELECTORS.POSTER_IMAGE);

        this.videoWrapper = this.querySelector(SELECTORS.RESPONSIVE_VIDEO_WRAPPER);
        this.soundBtn = this.querySelector(SELECTORS.SOUND_TOGGLE);

        this.playIcon = this.querySelector(SELECTORS.ICON_PLAY);
        this.soundOnIcon = this.querySelector(SELECTORS.ICON_SOUND_ON);
        this.soundOffIcon = this.querySelector(SELECTORS.ICON_SOUND_OFF);
    }

    getSources() {
        return Array.from(this.sourcesTemplate.content.querySelectorAll('source')).map((s) => ({
            src: s.src,
            media: s.media
        }));
    }

    cleanSourceURL(src) {
        if (src.startsWith('//')) {
            src = `${window.location.protocol}${src}`;
        }

        return new URL(src, window.location.href).href;
    }

    updateSource() {
        const match = this.sources.find((s) => s.media && matchMedia(s.media).matches);
        const fallback = this.sources.find((s) => !s.media);
        const nextSrc = (match || fallback || this.sources[0]).src;

        if (!nextSrc) return;

        const newSourceUrl = this.cleanSourceURL(nextSrc);

        if (this.video.src) {
            const currentSourceUrl = this.cleanSourceURL(this.video.src);
            if (currentSourceUrl === newSourceUrl) return;
        }

        this.currentSource = nextSrc;
    }

    load() {
        this.video.src = this.currentSource;
        //this.video.load();
    }

    onResize() {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
            this.updateSource();
            this.load();
            const playing = !this.video.paused;
            playing && this.video.play().catch(() => {});
        }, 150);
    }

    onClick(e) {
        if (e.target.closest('[data-sound-toggle]')) {
            this.toggleSound();
        } else {
            this.togglePlay();
        }
    }

    togglePlay() {
        this.video.paused ? this.video.play().catch(() => {}) : this.video.pause();
        this.updateControlsUI();
    }

    toggleSound() {
        this.video.muted = !this.video.muted;
        this.updateControlsUI();
    }

    onLoaded() {
        if (this.poster) {
            this.poster.style.opacity = '0';
        }
        this.video.style.opacity = '1';
        /* if (this.video.hasAttribute('autoplay')) {
            this.video.muted = true;
            this.video.play().catch(() => {});
        } */
        this.updateControlsUI();
    }

    updateControlsUI() {
        if (this.playIcon) {
            this.playIcon.classList.toggle('hidden', !this.video.paused);
        }
        if (this.soundOnIcon && this.soundOffIcon) {
            this.soundOnIcon.classList.toggle('hidden', this.video.muted);
            this.soundOffIcon.classList.toggle('hidden', !this.video.muted);
        }
    }

    disconnectedCallback() {
        this.removeEventListener('click', this.onClick);
        this.soundBtn?.removeEventListener('click', this.onSound);
        this.video.removeEventListener('loadeddata', this.onLoaded);
        window.removeEventListener('resize', this.onResize);
    }
}

customElements.define('responsive-video', ResponsiveVideo);

export function loadManualVideos(container = document) {
    container.querySelectorAll('responsive-video[data-load-type="manual"]').forEach((el) => el.load());
}
