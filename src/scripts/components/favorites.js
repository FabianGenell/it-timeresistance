class FavoriteHandler {
    constructor() {
        this.favorites = this.fetchFavorites();

        this.displayCountEls = document.querySelectorAll('[data-js-favorites-count]');

        this.updateDisplayCount();

        console.debug('Favorites', this.favorites);
    }

    fetchFavorites() {
        const storedFavorites = localStorage.getItem('favorites');
        let favorites = [];
        if (storedFavorites) {
            try {
                const parsed = JSON.parse(storedFavorites);
                if (Array.isArray(parsed)) {
                    favorites = parsed;
                }
            } catch (error) {
                console.error('Error parsing favorites from localStorage', error);
            }
        }
        return favorites;
    }

    removeFavorite(favoriteItem) {
        this.favorites = this.favorites.filter((favorite) => favorite.handle !== favoriteItem.handle);
        console.debug('Favorites after removal', this.favorites);
        this.updateLocalStorage(this.favorites);
        this.updateDisplayCount();
    }

    addFavorite(favoriteItem) {
        this.favorites.push(favoriteItem);
        console.debug('Favorites after addition', this.favorites);
        this.updateLocalStorage(this.favorites);
        this.updateDisplayCount();
    }

    updateDisplayCount() {
        this.displayCountEls.forEach((el) => {
            el.textContent = this.favorites.length;

            if (this.favorites.length === 0) {
                el.classList.add('opacity-0');
            } else {
                el.classList.remove('opacity-0');
            }
        });
    }

    updateLocalStorage(favorites) {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

const favoriteHandler = new FavoriteHandler();

/**
 * Represents the MainFavorites custom element.
 * @class
 * @extends HTMLElement
 */
class FavoriteProducts extends HTMLElement {
    constructor() {
        super();

        this.productGrid = this.querySelector('[data-product-grid]');
        this.spinner = this.querySelector('[data-spinner]');
        this.emptyStateEl = this.querySelector('[data-empty-state]');

        if (favoriteHandler.favorites.length > 0) {
            this.fetchProducts();
        } else {
            this.emptyStateEl.classList.remove('hidden');
            this.spinner.classList.add('hidden');
        }
    }

    /**
     * Fetches the HTML content of a product using its handle and variant ID if available.
     *
     * @param {Object} favorite - The favorite object containing handle and optional variantId.
     * @returns {Promise<HTMLLIElement>} - A promise that resolves to an HTML list item element containing the fetched product HTML.
     */
    async fetchProductHTML(favorite) {
        let url = `/products/${favorite.handle}?view=card`;

        if (favorite.variantId) {
            url += `&variant=${favorite.variantId}`;
        }

        const productHTML = await fetch(url).then((res) => res.text());

        const parser = new DOMParser();
        const doc = parser.parseFromString(productHTML, 'text/html');
        const favoritesResult = doc.querySelector('.product-item');

        return favoritesResult;
    }

    batchArray(arr, size) {
        const batchedArray = [];
        for (let i = 0; i < arr.length; i += size) {
            batchedArray.push(arr.slice(i, i + size));
        }
        return batchedArray;
    }

    /**
     * Fetches products and appends them to the product grid.
     * @returns {Promise<Array<HTMLElement>>} An array of HTML elements representing the fetched products.
     */
    async fetchProducts() {
        const batchedFavorites = this.batchArray(favoriteHandler.favorites, 4);
        await Promise.all(
            batchedFavorites.map(async (favoritesArray) => {
                const productsHTML = await Promise.all(
                    favoritesArray.map(async (favorite) => this.fetchProductHTML(favorite))
                );
                productsHTML.forEach((el) => {
                    try {
                        return this.productGrid.appendChild(el);
                    } catch (error) {}
                });
                return productsHTML;
            })
        );
        this.spinner.classList.add('hidden');
    }
}

customElements.define('favorite-products', FavoriteProducts);

class AddFavorite extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.productHandle = this.dataset.productHandle;
        this.variantId = this.dataset.variantId;

        this.favoriteItem = {
            handle: this.productHandle
        };

        if (this.variantId) {
            this.favoriteItem.variantId = this.variantId;
        }

        this.addEventListener('click', this.handleClick.bind(this));
        this.updateState();
    }

    get isFavorite() {
        return favoriteHandler.favorites.some(
            (favorite) => JSON.stringify(favorite) === JSON.stringify(this.favoriteItem)
        );
    }

    handleClick() {
        if (this.isFavorite) {
            this.removeFavorite();
        } else {
            this.addFavorite();
        }
        this.updateState();
    }

    removeFavorite() {
        favoriteHandler.removeFavorite(this.favoriteItem);
    }

    addFavorite() {
        favoriteHandler.addFavorite(this.favoriteItem);
    }

    updateState() {
        if (this.isFavorite) {
            this.setAttribute('added', '');
        } else {
            this.removeAttribute('added');
        }
    }
}

customElements.define('add-favorite', AddFavorite);
