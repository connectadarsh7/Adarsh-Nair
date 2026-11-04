(() => {
  if (window.loomhausCartCountInitialized) return;
  window.loomhausCartCountInitialized = true;

  let cartCountRequest;
  let cartCountRefreshQueued = false;

  function renderCartCount(itemCount) {
    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = itemCount;
    });

    document.querySelectorAll('.loomhaus-header__cart').forEach((link) => {
      link.setAttribute('aria-label', `Shopping cart, ${itemCount} items`);
    });
  }

  async function updateCartCount(cartData) {
    if (Number.isInteger(cartData?.item_count)) {
      renderCartCount(cartData.item_count);
      return;
    }

    if (cartCountRequest) {
      cartCountRefreshQueued = true;
      await cartCountRequest;
      return;
    }

    const root = window.Shopify?.routes?.root || '/';
    const shopRoot = root.endsWith('/') ? root : `${root}/`;

    cartCountRequest = fetch(`${shopRoot}cart.js`, {
      headers: { Accept: 'application/json' }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to fetch the latest cart count.');
        }

        return response.json();
      })
      .then((cart) => {
        if (!Number.isInteger(cart.item_count)) {
          throw new Error('Cart response did not contain an item count.');
        }

        renderCartCount(cart.item_count);
      })
      .catch((error) => {
        console.error('Loomhaus cart count update error:', error);
      })
      .finally(() => {
        cartCountRequest = null;
        if (cartCountRefreshQueued) {
          cartCountRefreshQueued = false;
          updateCartCount();
        }
      });

    await cartCountRequest;
  }

  function watchCartRequests() {
    if (window.loomhausCartRequestsObserved) return;

    window.loomhausCartRequestsObserved = true;
    const fetchCartRequest = window.fetch.bind(window);
    const cartMutationPath = /\/cart\/(?:add|change|update|clear)(?:\.js)?$/;

    window.fetch = (...args) => {
      const requestUrl = args[0] instanceof Request ? args[0].url : args[0];
      let isCartMutation = false;

      try {
        isCartMutation = cartMutationPath.test(new URL(requestUrl, window.location.href).pathname);
      } catch (error) {
        console.error('Loomhaus cart request URL error:', error);
      }

      const responsePromise = fetchCartRequest(...args);
      if (!isCartMutation) return responsePromise;

      return responsePromise.then((response) => {
        if (response.ok) {
          response.clone().json()
            .then((cartData) => {
              if (Number.isInteger(cartData.item_count)) {
                renderCartCount(cartData.item_count);
              } else {
                updateCartCount();
              }
            })
            .catch((error) => {
              console.error('Loomhaus cart response error:', error);
            });
        }

        return response;
      });
    };
  }

  function initCartCount() {
    watchCartRequests();
    updateCartCount();

    document.addEventListener('cart:updated', (event) => {
      updateCartCount(event.detail);
    });

    document.addEventListener('loomhaus:cart:count', (event) => {
      if (Number.isInteger(event.detail?.itemCount)) {
        renderCartCount(event.detail.itemCount);
      }
    });

    if (
      typeof subscribe === 'function' &&
      typeof PUB_SUB_EVENTS !== 'undefined' &&
      PUB_SUB_EVENTS.cartUpdate
    ) {
      subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
        updateCartCount(event?.cartData);
      });
    }

    window.addEventListener('pageshow', () => {
      updateCartCount();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartCount, { once: true });
  } else {
    initCartCount();
  }
})();
