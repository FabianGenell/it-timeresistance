class CurrencySelector extends HTMLElement {
    constructor() {
        super();
        this.select = this.querySelector('#marketSelector');
    }

    connectedCallback() {
        if (this.select) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        this.select.addEventListener('change', (event) => this.handleMarketChange(event));
    }

    handleMarketChange(event) {
        const selectedOption = event.target.selectedOptions[0];
        const targetUrl = selectedOption.dataset.url;

        if (!targetUrl) return;

        window.location.href = targetUrl;
    }
}

customElements.define('currency-selector', CurrencySelector);
