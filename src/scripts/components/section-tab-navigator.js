class SectionTabNavigator extends HTMLElement {
    constructor() {
        super();

        if (Shopify.designMode) {
            this.blockSelectHandler = this.blockSelectHandler || this.handleBlockSelect.bind(this);
            this.section.addEventListener('shopify:block:select', this.blockSelectHandler);
        }
    }

    connectedCallback() {
        this.init();
        this.addEventListener('click', this.handleClick.bind(this));
    }

    init() {
        const { sectionId, activeTextClass } = this.dataset;
        this.section = document.getElementById(sectionId);
        this.activeTextClass = activeTextClass;

        this.backgroundBlob = this.querySelector('.background-blob');

        const firstNavigator = this.querySelector('[data-navigate-tab]');

        if (!firstNavigator) {
            return console.warn("section-tab-navigator doesn't include any navigation links", this);
        }

        this.navigate(firstNavigator);
    }

    /**
     * Handles the click event.
     *
     * @param {Event} evt - The click event object.
     */
    handleClick(evt) {
        const target = evt.target.closest('[data-navigate-tab]');

        if (target) {
            this.navigate(target);
            return true;
        } else {
            return false;
        }
    }

    navigate(target) {
        this.updateUI(target);

        const tabName = target.dataset.navigateTab;

        const tabEls = this.section.querySelectorAll('[data-tab]');

        tabEls.forEach((tabEl) => {
            if ((tabName === 'all' || tabName === 'alla') && !tabEl.hasAttribute('data-not-all')) {
                return tabEl.classList.remove('js-hidden');
            }

            const elTabs = tabEl.dataset.tab.split(',');

            const show = elTabs.includes(tabName);

            tabEl.classList.toggle('js-hidden', !show);
        });

        this.target = target;

        this.section.dispatchEvent(
            new CustomEvent('sectionTabNavigated', {
                detail: {
                    tabName: tabName
                }
            })
        );
    }

    updateUI(target) {
        if (this.target && this.activeTextClass) {
            this.target.classList.remove(this.activeTextClass);
        }

        if (target && this.backgroundBlob) {
            if (this.activeTextClass) {
                target.classList.add(this.activeTextClass);
            }

            const targetRect = target.getBoundingClientRect();
            const parentRect = target.offsetParent.getBoundingClientRect();

            this.backgroundBlob.style.width = `${targetRect.width}px`;
            this.backgroundBlob.style.left = `${targetRect.left - parentRect.left}px`;
        }
    }

    handleBlockSelect(evt) {
        const handled = handleClick(evt);

        if (handled) return;

        const blockEl = evt.target;

        if (!blockEl) return console.warn('No block selected');

        if (evt.target.classList.contains('js-hidden')) {
            let tabs = [];

            if (tabEl.hasAttribute('data-tab')) {
                tabs = tabEl.dataset.tab.split(',');
            }

            if (tabEl.hasAttribute('data-flickity-tab')) {
                tabs = blockEl.dataset.flickityTab.split(',');
            }

            if (tabs.length > 0) {
                const tabName = slideTabs[0];
                this.navigate(tabName);
            }
        }
    }
}

customElements.define('section-tab-navigator', SectionTabNavigator);

//They maybe shpuld extend eachother for DRY
export class RadioBlob extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.init();
        this.addEventListener('input', this.handleInput.bind(this));
    }

    init() {
        this.activeTextClass = this.dataset.activeTextClass;

        this.backgroundBlob = this.querySelector('.background-blob');

        const firstNavigator = this.querySelector('input[type="radio"]:checked');

        if (!firstNavigator) {
            return console.warn("section-tab-navigator doesn't include any navigation links", this);
        }

        this.handleInput({ target: firstNavigator });
    }

    /**
     * Handles the click event.
     *
     * @param {Event} evt - The click event object.
     */
    handleInput(evt) {
        const target = evt.target.closest('li');

        if (target) {
            this.updateUI(target);
            return true;
        } else {
            return false;
        }
    }

    updateUI(target) {
        if (this.target && this.activeTextClass) {
            this.target.classList.remove(this.activeTextClass);
        }

        if (target && this.backgroundBlob) {
            if (this.activeTextClass) {
                target.classList.add(this.activeTextClass);
            }

            const targetRect = target.getBoundingClientRect();
            const parentRect = target.offsetParent.getBoundingClientRect();

            this.backgroundBlob.style.width = `${targetRect.width}px`;
            this.backgroundBlob.style.left = `${targetRect.left - parentRect.left}px`;
            this.backgroundBlob.style.top = `${targetRect.top - parentRect.top}px`;

            this.target = target;
        }
    }
}

customElements.define('radio-blob', RadioBlob);
