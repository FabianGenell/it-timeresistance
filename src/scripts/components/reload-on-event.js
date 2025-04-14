//chrom console: -url:https://au.timeresistance.com/cdn/shopifycloud/shopify-xr-js/v1.0/shopify-xr.en.js -url:chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/background-redux-new.js -url:https://au.timeresistance.com/cdn/shopifycloud/media-analytics/v0.1/analytics.js -runtime.lastError -ERR_BLOCKED
class ReloadOnEvent extends HTMLElement {
    constructor() {
        super();

        console.debug('ReloadOnEvent constructor');

        this.event = this.getAttribute('data-event');

        this.section = this.closest('.shopify-section');
        this.sectionId = this.section.id;
        this.shopifySectionId = this.sectionId.replace('shopify-section-', '');

        this.container = this.section.querySelector('[data-section-type]');
        this.sectionType = this.container.getAttribute('data-section-type');

        this.init();
    }

    init() {
        this.url = new URL(window.location.href);
        this.url.searchParams.set('sections', this.shopifySectionId);

        console.debug('ReloadOnEvent init, adding event listener for', this.event);
        document.addEventListener(this.event, this.handleChange.bind(this));
    }

    handleChange(event) {
        console.debug('ReloadOnEvent handleChange, reloading - event.detail:', event.detail);

        if (event.detail.variant) {
            this.url.searchParams.set('variant', event.detail.variant.id);
        }

        this.reload();
    }

    async reload() {
        await this.setNewHTML();
        window.Shopify.theme.sections.unload(this.container);

        const newContainer = this.querySelector(`[data-section-type="${this.sectionType}"]`);

        if (!newContainer) {
            console.error(
                `ReloadOnEvent reload: Failed to find the new container element with type [${this.sectionType}] after updating innerHTML.`
            );

            return;
        }

        this.container = newContainer;

        window.Shopify.theme.sections.load(this.sectionType, this.container);

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

    async setNewHTML() {
        try {
            const html = await this.fetchSectionHTML();
            if (!html) {
                console.error(
                    'ReloadOnEvent setNewHTML: Fetched HTML is empty or null for section',
                    this.shopifySectionId
                );
                return;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const fetchedShopifySection = doc.getElementById(this.sectionId);

            if (fetchedShopifySection) {
                const fetchedSelf = this.findSelfInHTML(fetchedShopifySection);

                if (fetchedSelf) {
                    this.innerHTML = fetchedSelf.innerHTML;
                } else {
                    console.warn(
                        'ReloadOnEvent setNewHTML: Could not find "self" (<reload-on-event>) element within the fetched section HTML using findSelfInHTML.'
                    );
                }
            } else {
                console.warn(
                    'ReloadOnEvent setNewHTML: Could not find the parent Shopify section element in the fetched HTML. Section ID:',
                    this.sectionId
                );
            }
        } catch (error) {
            console.error('ReloadOnEvent setNewHTML: Error fetching or parsing HTML:', error);
        }
    }

    async fetchSectionHTML() {
        console.debug('ReloadOnEvent fetchSectionHTML, url', this.url);
        const sectionJSON = await fetch(this.url).then((res) => res.json());

        console.debug('ReloadOnEvent fetchSectionHTML, sectionJSON', sectionJSON);

        return sectionJSON[this.shopifySectionId];
    }

    findSelfInHTML(doc) {
        // Build selector path by walking up DOM tree
        const path = [];
        let element = this;
        while (element) {
            let selector = element.tagName.toLowerCase();
            // Add nth-child if element has siblings
            if (element.parentElement) {
                const index = Array.from(element.parentElement.children).indexOf(element) + 1;
                if (index > 1) {
                    selector += `:nth-child(${index})`;
                }
            }
            path.unshift(selector);
            element = element.parentElement;
            // Stop at section container
            if (element && element.id === this.sectionId) break;
        }
        return doc.querySelector(path.join(' > '));
    }
}

customElements.define('reload-on-event', ReloadOnEvent);
