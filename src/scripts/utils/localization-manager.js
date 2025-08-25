import Cookies from 'js-cookie';

class LocalizationManager {
    static RECOMMENDATION_URL =
        '/browsing_context_suggestions.json?source=geolocation_recommendation&country[enabled]=true';

    static COOKIE_NAME = 'geolocation_recommendation';
    static COOKIE_EXPIRATION_DAYS = 7;

    constructor() {
        this.currentCountry = Shopify?.country;
        this.init();
    }

    async init() {
        console.log('[LocalizationManager] init');
        console.log('[LocalizationManager] this.currentCountry', this.currentCountry);
        const countryCode = await this.getRecommendedOrSavedCountry();
        console.log('[LocalizationManager] countryCode', countryCode);

        /* 
            console.log('geolocation-recommendation', {
                currentCountry: this.currentCountry,
                recommendedCountry: countryCode
            }); 
            */
        document.dispatchEvent(
            new CustomEvent('geolocation-recommendation', {
                detail: {
                    currentCountry: this.currentCountry,
                    recommendedCountry: countryCode
                }
            })
        );
    }

    async getRecommendedOrSavedCountry() {
        const cookieValue = this.getCookie();

        if (cookieValue) {
            console.log('[LocalizationManager] cookieValue', cookieValue);
            return cookieValue;
        }

        const recommendedCountry = await this.getRecommendedCountry();
        return recommendedCountry;
    }

    async getRecommendedCountry() {
        const recommendation = await this.getLocalization();

        console.log('[LocalizationManager] recommendation', recommendation);

        if (recommendation?.suggestions?.length > 0) {
            return recommendation.suggestions[0].parts.country.handle;
        }

        if (recommendation?.detected_values?.country) {
            return recommendation.detected_values.country.handle;
        }

        throw new Error('No recommended country found', {
            cause: {
                currentCountry: this.currentCountry,
                recommendation
            }
        });
    }

    async getLocalization() {
        const response = await fetch(LocalizationManager.RECOMMENDATION_URL);
        const data = await response.json();
        return data;
    }

    getCookie() {
        const cookie = Cookies.get(LocalizationManager.COOKIE_NAME);
        return cookie;
    }

    setCookie(cookieValue) {
        Cookies.set(LocalizationManager.COOKIE_NAME, cookieValue, {
            expires: LocalizationManager.COOKIE_EXPIRATION_DAYS
        });
    }
}

const localizationManager = new LocalizationManager();
