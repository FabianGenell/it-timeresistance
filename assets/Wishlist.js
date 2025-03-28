const LOCAL_STORAGE_WISHLIST_KEY = 'shopify-wishlist';
const LOCAL_STORAGE_DELIMITER = ',';
const BUTTON_ACTIVE_CLASS = 'active';
const GRID_LOADED_CLASS = 'loaded';

const selectors = {
  button: '[button-wishlist]',
  grid: '[grid-wishlist]',
  productCard: '.product-item',
};

document.addEventListener('DOMContentLoaded', () => {
  initButtons();
  initGrid();
});

document.addEventListener('shopify-wishlist:updated', (event) => {
  console.log('[Shopify Wishlist] Wishlist Updated ', event.detail.wishlist);
  initGrid();
});

document.addEventListener('shopify-wishlist:init-product-grid', (event) => {
  console.log('[Shopify Wishlist] Wishlist Product List Loaded ', event.detail.wishlist);
});

document.addEventListener('shopify-wishlist:init-buttons', (event) => {
  console.log('[Shopify Wishlist] Wishlist Buttons Loaded ', event.detail.wishlist);
});

const fetchProductCardHTML = (item) => {
  const { handle, variantId } = item;
  const productTileTemplateUrl = `/products/${handle}?view=card&variant=${variantId}`;
  return fetch(productTileTemplateUrl)
    .then((res) => res.text())
    .then((res) => {
      const text = res;
      const parser = new DOMParser();
      const htmlDocument = parser.parseFromString(text, 'text/html');
      const productCard = htmlDocument.documentElement.querySelector(selectors.productCard);
      return productCard.outerHTML;
    })
    .catch((err) => console.error(`[Shopify Wishlist] Failed to load content for handle: ${handle}, variant: ${variantId}`, err));
};

const setupGrid = async (grid) => {
  const wishlist = getWishlist();
  const requests = wishlist.map(fetchProductCardHTML);
  const responses = await Promise.all(requests);
  const wishlistProductCards = responses.join('');
  grid.innerHTML = wishlistProductCards;
  grid.classList.add(GRID_LOADED_CLASS);
  initButtons();

  const event = new CustomEvent('shopify-wishlist:init-product-grid', {
    detail: { wishlist: wishlist }
  });
  document.dispatchEvent(event);
};

const setupButtons = (buttons) => {
  buttons.forEach((button) => {
    const productHandle = button.dataset.productHandle || false;
    const variantId = button.dataset.variantId || false;
    
    if (!productHandle || !variantId) {
      return console.error('[Shopify Wishlist] Missing required attributes. Failed to update the wishlist.');
    }
    
    if (wishlistContains(productHandle, variantId)) {
      button.classList.add(BUTTON_ACTIVE_CLASS);
    }
    
    button.addEventListener('click', () => {
      updateWishlist(productHandle, variantId);
      button.classList.toggle(BUTTON_ACTIVE_CLASS);
    });
  });
};

const initGrid = () => {
  const grid = document.querySelector(selectors.grid) || false;
  if (grid) setupGrid(grid);
};

const initButtons = () => {
  const buttons = document.querySelectorAll(selectors.button) || [];
  if (buttons.length) setupButtons(buttons);
  else return;
  const event = new CustomEvent('shopify-wishlist:init-buttons', {
    detail: { wishlist: getWishlist() }
  });
  document.dispatchEvent(event);
};

const getWishlist = () => {
  const wishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY) || false;
  if (wishlist) {
    try {
      return JSON.parse(wishlist);
    } catch (e) {
      return [];
    }
  }
  return [];
};

const setWishlist = (array) => {
  if (array.length) {
    localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(array));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_WISHLIST_KEY);
  }

  const event = new CustomEvent('shopify-wishlist:updated', {
    detail: { wishlist: array }
  });
  document.dispatchEvent(event);
  return array;
};

const updateWishlist = (handle, variantId) => {
  const wishlist = getWishlist();
  const indexInWishlist = wishlist.findIndex(item => 
    item.handle === handle && item.variantId === variantId
  );
  
  if (indexInWishlist === -1) {
    wishlist.push({ handle, variantId });
  } else {
    wishlist.splice(indexInWishlist, 1);
  }
  
  return setWishlist(wishlist);
};

const wishlistContains = (handle, variantId) => {
  const wishlist = getWishlist();
  return wishlist.some(item => 
    item.handle === handle && item.variantId === variantId
  );
};

const resetWishlist = () => {
  return setWishlist([]);
};
