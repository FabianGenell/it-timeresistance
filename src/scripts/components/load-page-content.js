import { initLazyMedia } from '../utils/helpers/lazy-media.js';
import { afterCallstack } from '../utils/utils.js';

const LOAD_TYPES = {
    DOM: 'dom',
    LOAD: 'load',
    MANUAL: 'manual'
};

const REMOVE_CLASSES = ['page__inner', 'section'];

class LoadPageContent extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const { pageUrl, lazyType } = this.dataset;

        this.pageUrl = pageUrl;
        this.lazyType = lazyType;

        if (!this.pageUrl) return console.warn('No page URL provided for load-page-content', this);

        this.handleLoadType();
    }

    handleLoadType() {
        try {
            switch (this.lazyType) {
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
                    console.warn(
                        '[LoadPageContent] No lazy type provided, loading content immediately',
                        this
                    );
                    this.loadContent();
                    break;
            }
        } catch (error) {
            console.warn('[LoadPageContent] Failed to handle load type:', error);
            // Fallback to setting initial source
            try {
                this.loadContent();
            } catch (fallbackError) {
                console.warn('[LoadPageContent] Failed to load content as fallback:', fallbackError);
            }
        }
    }

    loadOnDOMReady() {
        try {
            const execute = () => {
                try {
                    afterCallstack(() => this.loadContent());
                } catch (error) {
                    console.warn('[LoadPageContent] Failed to execute DOM ready callback:', error);
                }
            };

            if (document.readyState !== 'loading') {
                return execute();
            }

            document.addEventListener('DOMContentLoaded', execute);
        } catch (error) {
            console.warn('[LoadPageContent] Failed to setup DOM ready loading:', error);
        }
    }

    loadOnWindowLoad() {
        try {
            const execute = () => {
                try {
                    afterCallstack(() => this.loadContent());
                } catch (error) {
                    console.warn('[LoadPageContent] Failed to execute window load callback:', error);
                }
            };

            if (document.readyState === 'complete') {
                return execute();
            }

            window.addEventListener('load', execute);
        } catch (error) {
            console.warn('[LoadPageContent] Failed to setup window load loading:', error);
        }
    }

    loadContent() {
        fetch(this.pageUrl)
            .then((response) => response.text())
            .then((html) => {
                const mainContent = this.cleanSectionHTML(html);

                if (mainContent) {
                    this.innerHTML = mainContent.innerHTML;
                } else {
                    console.warn('No main content found in the page', this.pageUrl);
                }
            })
            .then(() => {
                initLazyMedia();
            })
            .catch((error) => {
                console.warn('[LoadPageContent] Failed to load content:', error);
            });
    }

    cleanSectionHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const mainContent = doc.querySelector('main');

        REMOVE_CLASSES.forEach((className) => {
            mainContent.querySelectorAll(`.${className}`).forEach((el) => el.classList.remove(className));
        });

        return mainContent;
    }
}

customElements.define('load-page-content', LoadPageContent);
