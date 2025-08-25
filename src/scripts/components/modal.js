import BaseOverlay from './base-overlay.js';
import { createFocusTrap } from 'focus-trap';

export default class Modal extends BaseOverlay {
    constructor() {
        super();
        this.focusTrap = null;
    }

    connectedCallback() {
        super.connectedCallback();
        this.initFocusTrap();
    }

    initFocusTrap() {
        this.focusTrap = createFocusTrap(this, {
            allowOutsideClick: true,
            escapeDeactivates: false,
            fallbackFocus: this,
            initialFocus: () => {
                return this.querySelector('[autofocus], .modal__close, .modal__content') || this;
            },
            onDeactivate: () => {
                if (this.isOpen) {
                    this.close();
                }
            }
        });
    }

    shouldCloseOnOutsideClick() {
        return true;
    }

    getContentElement() {
        return this.querySelector('.modal__content');
    }

    onOpen() {
        this.setAttribute('aria-modal', 'true');
        this.setAttribute('role', 'dialog');

        if (this.focusTrap) {
            this.focusTrap.activate();
        }
    }

    onClose() {
        this.removeAttribute('aria-modal');

        if (this.focusTrap && this.focusTrap.active) {
            this.focusTrap.deactivate();
        }
    }

    destroy() {
        if (this.focusTrap) {
            this.focusTrap.deactivate();
        }
        super.destroy();
    }
}

customElements.define('modal-dialog', Modal);
