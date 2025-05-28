//chrom console: -url:https://au.timeresistance.com/cdn/shopifycloud/shopify-xr-js/v1.0/shopify-xr.en.js -url:chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/background-redux-new.js -url:https://au.timeresistance.com/cdn/shopifycloud/media-analytics/v0.1/analytics.js -runtime.lastError -ERR_BLOCKED
class ReloadOnEvent extends HTMLElement {
    static sectionListeners = {};

    constructor() {
        super();
    }

    static registerSectionListener(sectionId, event, callback) {
        if (!this.sectionListeners[event]) {
            const listener = document.addEventListener(event, (eventData) => {
                this.handleEvent(event, eventData);
            });

            this.sectionListeners[event] = {
                listener,
                sections: {}
            };
        }

        const sectionListener = this.sectionListeners[event];

        if (!sectionListener.sections[sectionId]) {
            sectionListener.sections[sectionId] = [];
        }

        sectionListener.sections[sectionId].push(callback);
    }

    static async handleEvent(event, eventData) {
        const sectionIds = Object.keys(this.sectionListeners[event].sections);

        const url = new URL(window.location.href);

        if (eventData?.detail?.variant) {
            url.searchParams.set('variant', eventData.detail.variant.id);
        }

        url.searchParams.set('sections', sectionIds.join(','));

        const sectionJSON = await this.fetchSectionHTML(url);

        sectionIds.forEach((sectionId) => {
            const sectionListener = this.sectionListeners[event].sections[sectionId];

            sectionListener.forEach((callback) => {
                callback(sectionJSON[sectionId]);
            });
        });
    }

    static async fetchSectionHTML(url) {
        const sectionJSON = await fetch(url).then((res) => res.json());

        return sectionJSON;
    }

    static unregisterSectionListener(sectionId, event) {
        const sectionListener = this.sectionListeners[event];

        delete sectionListener.sections[sectionId];

        if (Object.keys(sectionListener.sections).length === 0) {
            document.removeEventListener(event, sectionListener.listener);
            delete this.sectionListeners[event];
        }
    }

    connectedCallback() {
        this.event = this.getAttribute('data-event');

        if (!this.id) {
            console.error('ReloadOnEvent: No id attribute found on element');
            return;
        }

        this.section = this.closest('.shopify-section');
        this.sectionId = this.section.id;
        this.shopifySectionId = this.sectionId.replace('shopify-section-', '');

        if (this.dataset.reloadSection !== 'false') {
            this.container = this.section.querySelector('[data-section-type]');
            if (this.container) {
                this.sectionType = this.container.getAttribute('data-section-type');
            }
        }

        ReloadOnEvent.registerSectionListener(
            this.shopifySectionId,
            this.event,
            this.updateSection.bind(this)
        );
    }

    disconnectedCallback() {
        ReloadOnEvent.unregisterSectionListener(this.sectionId, this.event);
    }

    updateSection(html) {
        this.setNewHTML(html);

        if (this.container) {
            this.reloadSection();
        }

        this.dispatchEvent(
            new CustomEvent('reload-on-event:loaded', {
                bubbles: true,
                detail: {
                    sectionId: this.sectionId,
                    shopifySectionId: this.shopifySectionId
                }
            })
        );
    }

    reloadSection() {
        window.Shopify.theme.sections.unload(this.container);

        const newContainer = this.section.querySelector(`[data-section-type="${this.sectionType}"]`);

        if (!newContainer) {
            console.error(
                `ReloadOnEvent reload: Failed to find the new container element with type [${this.sectionType}] after updating innerHTML.`
            );

            return;
        }

        this.container = newContainer;

        window.Shopify.theme.sections.load(this.sectionType, this.container);
    }

    async setNewHTML(html) {
        try {
            if (!html) {
                console.error(
                    'ReloadOnEvent setNewHTML: Fetched HTML is empty or null for section',
                    this.shopifySectionId
                );
                return;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const fetchedSelf = doc.getElementById(this.id);

            if (!fetchedSelf) {
                console.error(
                    `ReloadOnEvent: Could not find "self" (<reload-on-event id="${this.id}">) element within the fetched section HTML.`
                );
            }

            this.innerHTML = fetchedSelf.innerHTML;
        } catch (error) {
            console.error('ReloadOnEvent setNewHTML: Error fetching or parsing HTML:', error);
        }
    }
}

customElements.define('reload-on-event', ReloadOnEvent);
