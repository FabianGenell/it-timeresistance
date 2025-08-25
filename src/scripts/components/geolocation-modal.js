import Modal from './modal.js';
import countries from 'i18n-iso-countries';
import enCountryLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enCountryLocale);

const SELECTORS = {
    CONTENT_TEMPLATE: '[data-content-template]',
    COUNTRY_WITH_FLAG_TEMPLATE: '[data-country-with-flag-template]',
    URL_TEMPLATE: '[data-url-template]',
    OPTION_DATA: '[data-redirect-option-data]',
    ACCEPT_BUTTON: '[data-geo-accept]'
};

class GeolocationModal extends Modal {
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        this.init();
    }

    init() {
        console.debug('[GeolocationModal] init');

        if (sessionStorage.getItem('geolocation-modal-closed')) {
            console.debug('[GeolocationModal] init: geolocation-modal-closed');
            return;
        }

        this.getGeolocationOptionData();

        this.shopCountryRedirectOption = this.getCurrentRedirectOption();

        document.addEventListener(
            'geolocation-recommendation',
            this.handleGeolocationRecommendation.bind(this)
        );
    }

    getGeolocationOptionData() {
        console.debug('[GeolocationModal] getGeolocationOptionData');

        try {
            const redirectOptionData = this.querySelector(SELECTORS.OPTION_DATA);
            if (!redirectOptionData) {
                throw new Error(
                    `Missing geolocation data script (${SELECTORS.OPTION_DATA}) in geoloaction modal`
                );
            }

            const json = JSON.parse(redirectOptionData.textContent);

            this.redirectOptions = json.redirect_options;

            console.debug('[GeolocationModal] this.redirectOptions', this.redirectOptions);

            if (!this.redirectOptions) {
                throw new Error('Missing redirect options in geoloaction data');
            }

            redirectOptionData.remove();
        } catch (error) {
            throw new Error(`Error getting geoloaction data: ${error}`, this);
        }
    }

    getRedirectOption(country) {
        const getPotentialRedirect = (redirectOptions) => {
            console.debug('[GeolocationModal] getRedirectOption', country);
            console.debug('[GeolocationModal] redirectOptions', redirectOptions);
            const redirectOptionByCountry = redirectOptions.find((redirectOption) =>
                redirectOption.countries.includes(country)
            );

            if (redirectOptionByCountry) {
                return redirectOptionByCountry;
            }

            return redirectOptions.find((redirectOption) => redirectOption.is_default);
        };

        const redirectOption = getPotentialRedirect(this.redirectOptions);

        if (this.shopCountryRedirectOption && this.shopCountryRedirectOption.name === redirectOption.name) {
            return null;
        }

        return redirectOption;
    }

    getCurrentRedirectOption() {
        let currentOrigin = window.location.origin + window.Shopify.routes.root;

        if (currentOrigin.endsWith('/')) {
            currentOrigin = currentOrigin.slice(0, -1);
        }

        const redirectOption = this.redirectOptions.find((redirectOption) => {
            const originMatch = redirectOption.redirect_url.includes(currentOrigin);
            console.debug('[GeolocationModal] getCurrentRedirectOption', {
                currentOrigin,
                redirectUrl: redirectOption.redirect_url,
                originMatch
            });

            return originMatch;
        });
        return redirectOption;
    }

    populateTemplate({ customerCountry, shopCountry, redirectOption }) {
        if (!this.contentTemplate) {
            this.contentTemplate = this.querySelector(SELECTORS.CONTENT_TEMPLATE);
            if (!this.contentTemplate) {
                throw new Error(
                    `Missing content template (${SELECTORS.CONTENT_TEMPLATE}s) in geoloaction modal`
                );
            }
        }

        const contentString = this.contentTemplate.innerHTML
            .replaceAll('[customer_country]', customerCountry)
            .replaceAll('[shop_country]', shopCountry)
            .replaceAll('[shop_country_w_flag]', this.getCountryHTMlWithFlag(this.shopCountryRedirectOption))
            .replaceAll('[redirect_name]', redirectOption.name)
            .replaceAll('[redirect_name_w_flag]', this.getCountryHTMlWithFlag(redirectOption))
            .replaceAll('[redirect_url]', this.getUrlTemplate(redirectOption.redirect_url));

        console.debug('[GeolocationModal] contentString', contentString);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentString;
        this.contentTemplate.parentNode.insertBefore(tempDiv.firstElementChild, this.contentTemplate);

        console.debug('[GeolocationModal] tempDiv', tempDiv);

        this.contentTemplate.remove();
    }

    getCountryHTMlWithFlag(redirectOption) {
        if (!redirectOption.image_url) {
            return redirectOption.name; // Return just the name if no image
        }

        if (!this.countryWithFlagTemplate) {
            this.countryWithFlagTemplate = this.querySelector(SELECTORS.COUNTRY_WITH_FLAG_TEMPLATE);
            if (!this.countryWithFlagTemplate) {
                throw new Error(
                    `Missing country with flag template (${SELECTORS.COUNTRY_WITH_FLAG_TEMPLATE}s) in geoloaction modal`
                );
            }
        }

        const countryWithFlagTemplate = this.countryWithFlagTemplate.innerHTML
            .replaceAll('[image_url]', redirectOption.image_url)
            .replaceAll('[name]', redirectOption.name);

        this.countryWithFlagTemplate.remove();

        return countryWithFlagTemplate;
    }

    getUrlTemplate(url) {
        const urlObj = new URL(url);
        const urlClean = urlObj.origin.replace('https://', '').replace('http://', '');

        if (!this.urlTemplate) {
            this.urlTemplate = this.querySelector(SELECTORS.URL_TEMPLATE);
            if (!this.urlTemplate) {
                return url; // Fallback to plain URL if template not found
            }
        }

        console.debug('[GeolocationModal] getUrlTemplate', { url, urlClean });

        const urlTemplate = this.urlTemplate.innerHTML
            .replaceAll('[url]', url)
            .replaceAll('[url_clean]', urlClean);

        return urlTemplate;
    }

    getCountryFromISO(isoCode) {
        if (!isoCode) {
            throw new Error(`Invalid ISO code: ${isoCode}`);
        }

        return countries.getName(isoCode, 'en');
    }

    handleGeolocationRecommendation(event) {
        console.debug('[GeolocationModal] handleGeolocationRecommendation', event);

        this.recommendedCountry = event.detail.recommendedCountry;

        const redirectOption = this.getRedirectOption(this.recommendedCountry);
        console.debug('[GeolocationModal] redirectOption', redirectOption);
        if (redirectOption) {
            this.populateTemplate({
                customerCountry: this.getCountryFromISO(this.recommendedCountry),
                shopCountry: this.shopCountryRedirectOption.name,
                redirectOption: redirectOption
            });

            console.debug('[GeolocationModal] recommendedCountry', this.recommendedCountry);

            this.delegateClick(SELECTORS.ACCEPT_BUTTON, (match, event) => {
                this.handleAcceptButtonClick({
                    redirectOption
                });
            });

            this.open();
            console.debug('[GeolocationModal] this', this);
        }
    }

    handleAcceptButtonClick({ redirectOption }) {
        try {
            console.debug('[GeolocationModal] handleAcceptButtonClick', redirectOption);
            const currentPath = this.getCurrentPath();
            const redirectUrl = new URL(redirectOption.redirect_url);
            if (this.recommendedCountry) {
                redirectUrl.searchParams.set('country', this.recommendedCountry);
            }

            // Combine the redirect URL path with the current path
            const basePath = redirectUrl.pathname === '/' ? '' : redirectUrl.pathname;
            redirectUrl.pathname = basePath + currentPath;

            window.location.href = redirectUrl.toString();
        } catch (error) {
            console.error('[GeolocationModal] handleAcceptButtonClick', error);
            window.location.href = redirectOption.redirect_url;
        }
    }

    getCurrentPath() {
        const rootpath = window.Shopify.routes.root;
        const pathname = window.location.pathname.replace(rootpath, '');
        const search = window.location.search;

        return pathname + search;
    }

    onClose() {
        sessionStorage.setItem('geolocation-modal-closed', 'true');
    }

    onThemeEditorLoad() {
        this.populateTemplate({
            customerCountry: this.getCountryFromISO('LT'),
            shopCountry: this.shopCountryRedirectOption.name,
            redirectOption: this.redirectOptions.find((redirectOption) => redirectOption.is_default)
        });
    }
}

customElements.define('geolocation-modal', GeolocationModal);
