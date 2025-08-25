import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { addFastClick } from '../utils/utils.js';

const SHOW_PAGE_ATTRIBUTE = 'data-show-page';
const PAGE_ATTRIBUTE = 'data-page';

export default class BaseOverlay extends HTMLElement {
    constructor() {
        super();
        this._toggleListeners = new Map();
        this._delegatedCleanupFunctions = [];
    }

    static get observedAttributes() {
        return ['open'];
    }

    connectedCallback() {
        this._init();
    }

    disconnectedCallback() {
        this.destroy();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'open') {
            if (newValue !== null && oldValue === null) {
                this._handleOpen();
            } else if (newValue === null && oldValue !== null) {
                this._handleClose();
            }
        }
    }

    _init() {
        this.sectionId = this.closest('section')?.id?.replace('shopify-section-', '');
        this.setupToggles();
        this.setupDelegatedShowPage();

        this.setupEventListeners();

        if (this.sectionId && window.Shopify?.designMode) {
            this.bindThemeEditorEvents();
        }
    }

    setupToggles() {
        const toggleAttribute = this.getToggleAttribute();
        if (!toggleAttribute) return;

        this.toggleSelector = `[${toggleAttribute}]`;

        this.setupDelegatedToggle();
    }

    setupDelegatedToggle() {
        const cleanup = this.delegateClickDocument(this.toggleSelector, (match, evt) => {
            evt.preventDefault();
            this.toggle();
        });
        this._delegatedCleanupFunctions.push(cleanup);
    }

    setupDelegatedShowPage() {
        const cleanup = this.delegateClick(`[${SHOW_PAGE_ATTRIBUTE}]`, (match, evt) => {
            // Only handle the event if the clicked element is within this overlay
            if (!this.contains(match)) {
                return;
            }
            evt.preventDefault();
            this.showPage(match.dataset.showPage);
        });
        this._delegatedCleanupFunctions.push(cleanup);
    }

    setupEventListeners() {
        this.addEventListener('keyup', this.handleKeyUp.bind(this));

        if (this.shouldCloseOnOutsideClick()) {
            this.addEventListener('click', this.handleOverlayClick.bind(this));
        }
    }

    handleKeyUp(evt) {
        if (evt.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }

    handleOverlayClick(evt) {
        const content = this.getContentElement();
        if (content && !content.contains(evt.target) && evt.target === this) {
            this.close();
        }
    }

    get isOpen() {
        return this.getAttribute('open') !== null;
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    open() {
        if (this.isOpen) return;
        this.setAttribute('open', '');
    }

    close() {
        if (!this.isOpen) return;
        this.removeAttribute('open');
    }

    _handleOpen() {
        const scrollTarget = this.getScrollLockTarget();
        if (scrollTarget) {
            disableBodyScroll(scrollTarget);
        }

        this.onOpen();
        this.dispatchEvent(new CustomEvent('overlay:open', { bubbles: true }));
    }

    _handleClose() {
        const scrollTarget = this.getScrollLockTarget();
        if (scrollTarget) {
            enableBodyScroll(scrollTarget);
        }

        this.onClose();
        this.dispatchEvent(new CustomEvent('overlay:close', { bubbles: true }));
    }

    destroy() {
        this.close();

        // Clean up direct listeners
        this._toggleListeners.forEach((handler, el) => {
            el.removeEventListener('click', handler);
        });
        this._toggleListeners.clear();

        // Clean up delegated listeners
        this._delegatedCleanupFunctions.forEach((cleanup) => cleanup());
        this._delegatedCleanupFunctions = [];
    }

    /**
     * Utility method for delegated event handling using fast click (scoped to overlay)
     * @param {string} selector - CSS selector to match against
     * @param {function} callback - Callback function (match, event) => {}
     * @returns {function} Cleanup function to remove the listener
     */
    delegateClick(selector, callback) {
        const handler = (e) => {
            const match = e.target.closest(selector);
            if (match && this.contains(match)) {
                callback(match, e);
            }
        };

        // Use addFastClick for optimized touch/mouse handling
        return addFastClick(this, handler);
    }

    /**
     * Utility method for document-level delegated event handling using fast click
     * @param {string} selector - CSS selector to match against
     * @param {function} callback - Callback function (match, event) => {}
     * @returns {function} Cleanup function to remove the listener
     */
    delegateClickDocument(selector, callback) {
        const handler = (e) => {
            const match = e.target.closest(selector);
            if (match && document.contains(match)) {
                callback(match, e);
            }
        };

        // Use addFastClick on document for global toggle elements
        return addFastClick(document.documentElement, handler);
    }

    // Methods to be overridden by subclasses
    getToggleAttribute() {
        return this.dataset.toggleAttribute;
    }

    getContentElement() {
        return this.querySelector('.overlay__content, .drawer__inner, .modal__content');
    }

    getScrollLockTarget() {
        return this.getContentElement() || this;
    }

    shouldCloseOnOutsideClick() {
        return false;
    }

    useDelegation() {
        return this.hasAttribute('data-use-delegation');
    }

    onOpen() {
        // Override in subclass
    }

    onClose() {
        // Override in subclass
    }

    bindThemeEditorEvents() {
        document.addEventListener('shopify:section:load', (e) => {
            if (e.detail.sectionId === this.sectionId) {
                this.onThemeEditorLoad(e);
            }
        });

        document.addEventListener('shopify:section:select', (e) => {
            if (e.detail.sectionId === this.sectionId) {
                this.open();
            }
        });

        document.addEventListener('shopify:block:select', (e) => {
            if (e.detail.sectionId === this.sectionId) {
                this.onThemeEditorBlockSelect(e);
                this.open();
            }
        });

        document.addEventListener('shopify:section:deselect', (e) => {
            if (e.detail.sectionId === this.sectionId) {
                this.close();
            }
        });

        document.addEventListener('shopify:block:deselect', (e) => {
            if (e.detail.sectionId === this.sectionId) {
                this.onThemeEditorBlockDeselect(e);
            }
        });
    }

    onThemeEditorLoad(event) {
        // Override in subclass if needed
    }

    onThemeEditorBlockSelect(event) {
        // Override in subclass if needed
    }

    onThemeEditorBlockDeselect(event) {
        // Override in subclass if needed
    }

    showPage(page) {
        console.log('showPage', page);
        const showingPageEl = this.querySelector(`[${PAGE_ATTRIBUTE}="${page}"]`);

        if (!showingPageEl) {
            throw new Error(`Page with ${PAGE_ATTRIBUTE}="${page}" not found`);
        }

        this.querySelectorAll(`[${PAGE_ATTRIBUTE}]`).forEach((pageEl) => {
            pageEl.classList.add('js-hidden');
        });

        showingPageEl.classList.remove('js-hidden');
    }
}

customElements.define('base-overlay', BaseOverlay);
