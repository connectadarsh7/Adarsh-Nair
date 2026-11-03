(() => {
  const drawer = document.querySelector('[data-loomhaus-cart]');
  if (!drawer || drawer.dataset.initialized === 'true') return;
  drawer.dataset.initialized = 'true';

  const panel = drawer.querySelector('[data-cart-panel]');
  const countElement = drawer.querySelector('[data-drawer-count]');
  const itemsContainer = drawer.querySelector('[data-drawer-items]');
  const subtotalElement = drawer.querySelector('[data-drawer-subtotal]');
  const errorElement = drawer.querySelector('[data-cart-error]');
  const emptyElement = drawer.querySelector('[data-cart-empty]');
  const footer = drawer.querySelector('[data-drawer-footer]');
  const checkout = drawer.querySelector('[data-cart-checkout]');
  const root = drawer.dataset.cartRoot.endsWith('/')
    ? drawer.dataset.cartRoot
    : `${drawer.dataset.cartRoot}/`;
  const autoVariantId = Number(drawer.dataset.autoVariantId) || null;

  let activeTrigger = null;
  let cartRequest = null;
  let isReconcilingAutoItem = false;
  let currentCart = null;

  const money = (amount) => {
    const currency = window.Shopify?.currency?.active || 'INR';
    return new Intl.NumberFormat(document.documentElement.lang || 'en-IN', {
      style: 'currency',
      currency
    }).format(Number(amount) / 100);
  };

  const cartUrl = (endpoint) => `${root}cart/${endpoint}.js`;

  async function requestCart(endpoint = '') {
    const response = await fetch(endpoint ? cartUrl(endpoint) : `${root}cart.js`, {
      headers: { Accept: 'application/json' }
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.description || result.message || 'Unable to update your cart.');
    }

    return result;
  }

  async function mutateCart(endpoint, data) {
    const response = await fetch(cartUrl(endpoint), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.description || result.message || 'Unable to update your cart.');
    }

    return result;
  }

  function isAutoItem(item) {
    return autoVariantId &&
      Number(item.variant_id) === autoVariantId &&
      item.properties?._loomhaus_auto_added === 'true';
  }

  function isBlackMedium(item) {
    if (isAutoItem(item)) return false;

    const options = item.options_with_values || [];
    const size = options.find((option) => /size/i.test(option.name))?.value;
    const color = options.find((option) => /colou?r/i.test(option.name))?.value;
    return String(size).trim().toLowerCase() === 'm' &&
      String(color).trim().toLowerCase() === 'black';
  }

  async function syncAutoItem(cart) {
    if (isReconcilingAutoItem) return cart;

    const needsAutoItem = cart.items.some(isBlackMedium);
    const autoItems = cart.items.filter(isAutoItem);
    const dismissedCartToken = window.sessionStorage.getItem('loomhaus-auto-item-dismissed');

    if (!autoVariantId) {
      if (needsAutoItem) {
        throw new Error(
          `${drawer.dataset.autoProductTitle} (M / Black) is unavailable. Please check the product in Shopify.`
        );
      }
      return cart;
    }

    if (
      needsAutoItem &&
      autoItems.length === 0 &&
      dismissedCartToken !== cart.token
    ) {
      isReconcilingAutoItem = true;
      try {
        await mutateCart('add', {
          id: autoVariantId,
          quantity: 1,
          properties: { _loomhaus_auto_added: 'true' }
        });
      } finally {
        isReconcilingAutoItem = false;
      }
      return requestCart();
    }

    if (!needsAutoItem && dismissedCartToken) {
      window.sessionStorage.removeItem('loomhaus-auto-item-dismissed');
    }

    if (!needsAutoItem && autoItems.length > 0) {
      isReconcilingAutoItem = true;
      try {
        let updatedCart = cart;
        for (const item of autoItems) {
          const currentItem = updatedCart.items.find((line) => line.key === item.key);
          if (currentItem) {
            updatedCart = await mutateCart('change', { id: currentItem.key, quantity: 0 });
          }
        }
        return updatedCart;
      } finally {
        isReconcilingAutoItem = false;
      }
    }

    return cart;
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderItem(item) {
    const row = makeElement('article', 'loomhaus-cart__item');
    const imageLink = makeElement('a', 'loomhaus-cart__image-link');
    imageLink.href = item.url || '#';

    if (item.image) {
      const image = makeElement('img', 'loomhaus-cart__image');
      image.src = item.image;
      image.alt = item.product_title || '';
      image.loading = 'lazy';
      imageLink.appendChild(image);
    }

    const content = makeElement('div', 'loomhaus-cart__item-content');
    const top = makeElement('div', 'loomhaus-cart__item-top');
    const title = makeElement('a', 'loomhaus-cart__product-title', item.product_title);
    title.href = item.url || '#';
    const price = makeElement('span', 'loomhaus-cart__price', money(item.final_line_price));
    top.append(title, price);
    content.appendChild(top);

    const options = (item.options_with_values || []).filter((option) => {
      return option.value && option.value !== 'Default Title';
    });
    if (options.length) {
      const variant = makeElement('div', 'loomhaus-cart__variant');
      options.forEach((option) => {
        variant.appendChild(makeElement('span', '', `${option.name}: ${option.value}`));
      });
      content.appendChild(variant);
    }

    const isAutoAdded = isAutoItem(item);
    if (isAutoAdded) {
      content.appendChild(makeElement('span', 'loomhaus-cart__auto-label', 'AUTO-ADDED'));
    }

    const actions = makeElement('div', 'loomhaus-cart__item-actions');
    const quantity = makeElement('div', 'loomhaus-cart__quantity');
    quantity.setAttribute('aria-label', `Quantity for ${item.product_title}`);

    const minus = makeElement('button', '', '−');
    minus.type = 'button';
    minus.setAttribute('aria-label', `Decrease quantity of ${item.product_title}`);
    minus.dataset.cartAction = 'decrease';
    minus.dataset.cartKey = item.key;

    const value = makeElement('span', 'loomhaus-cart__quantity-value', String(item.quantity));
    value.setAttribute('aria-live', 'polite');

    const plus = makeElement('button', '', '+');
    plus.type = 'button';
    plus.setAttribute('aria-label', `Increase quantity of ${item.product_title}`);
    plus.dataset.cartAction = 'increase';
    plus.dataset.cartKey = item.key;

    quantity.append(minus, value, plus);

    const remove = makeElement('button', 'loomhaus-cart__remove', 'Remove');
    remove.type = 'button';
    remove.dataset.cartAction = 'remove';
    remove.dataset.cartKey = item.key;
    remove.setAttribute('aria-label', `Remove ${item.product_title} from cart`);
    actions.append(quantity, remove);
    content.appendChild(actions);

    row.append(imageLink, content);
    return row;
  }

  function renderCart(cart) {
    currentCart = cart;
    countElement.textContent = cart.item_count;
    subtotalElement.textContent = money(cart.total_price);
    itemsContainer.replaceChildren();

    if (cart.items.length === 0) {
      emptyElement.hidden = false;
      itemsContainer.appendChild(emptyElement);
      footer.hidden = true;
      checkout.setAttribute('aria-disabled', 'true');
    } else {
      emptyElement.hidden = true;
      footer.hidden = false;
      checkout.removeAttribute('aria-disabled');
      cart.items.forEach((item) => itemsContainer.appendChild(renderItem(item)));
    }

    document.querySelectorAll('[data-cart-count]').forEach((element) => {
      element.textContent = cart.item_count;
    });
    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((trigger) => {
      trigger.setAttribute('aria-label', `Shopping cart, ${cart.item_count} items`);
    });
  }

  async function getLatestCart() {
    if (cartRequest) return cartRequest;

    cartRequest = requestCart()
      .then(syncAutoItem)
      .then((cart) => {
        renderCart(cart);
        errorElement.hidden = true;
        errorElement.textContent = '';
        return cart;
      })
      .catch((error) => {
        console.error('Loomhaus cart drawer error:', error);
        errorElement.textContent = error.message || 'Unable to load your cart. Please try again.';
        errorElement.hidden = false;
        throw error;
      })
      .finally(() => {
        cartRequest = null;
      });

    return cartRequest;
  }

  async function openDrawer(trigger) {
    activeTrigger = trigger || activeTrigger;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('loomhaus-cart-open');
    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((element) => {
      element.setAttribute('aria-expanded', 'true');
    });
    panel.focus();
    try {
      await getLatestCart();
    } catch (error) {
      // The visible alert reports the cart-loading error.
    }
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('loomhaus-cart-open');
    document.querySelectorAll('[data-cart-drawer-trigger]').forEach((element) => {
      element.setAttribute('aria-expanded', 'false');
    });
    if (activeTrigger?.isConnected) activeTrigger.focus();
  }

  async function changeItem(key, quantity, button) {
    if (button) button.disabled = true;
    errorElement.hidden = true;

    try {
      const removedAutoItem = quantity === 0 &&
        currentCart?.items.some((item) => item.key === key && isAutoItem(item));
      let cart = await mutateCart('change', { id: key, quantity });
      if (removedAutoItem) {
        window.sessionStorage.setItem('loomhaus-auto-item-dismissed', cart.token);
      }
      cart = await syncAutoItem(cart);
      renderCart(cart);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
    } catch (error) {
      console.error('Loomhaus cart item update error:', error);
      errorElement.textContent = error.message || 'Unable to update your cart. Please try again.';
      errorElement.hidden = false;
      try {
        renderCart(await requestCart());
      } catch (refreshError) {
        console.error('Loomhaus cart refresh error:', refreshError);
      }
    }
  }

  drawer.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-cart-close]');
    if (closeButton) {
      closeDrawer();
      return;
    }

    const actionButton = event.target.closest('[data-cart-action]');
    if (!actionButton) return;

    const key = actionButton.dataset.cartKey;
    const row = actionButton.closest('.loomhaus-cart__item');
    const currentQuantity = Number(row?.querySelector('.loomhaus-cart__quantity-value')?.textContent);
    if (!key || !Number.isInteger(currentQuantity)) return;

    if (actionButton.dataset.cartAction === 'remove') {
      changeItem(key, 0, actionButton);
    } else {
      const nextQuantity = currentQuantity + (actionButton.dataset.cartAction === 'increase' ? 1 : -1);
      changeItem(key, Math.max(0, nextQuantity), actionButton);
    }
  });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-cart-drawer-trigger]');
    if (!trigger) return;
    event.preventDefault();
    openDrawer(trigger);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }

    if (event.key === 'Tab' && drawer.classList.contains('is-open')) {
      const focusable = [...panel.querySelectorAll('button:not(:disabled), a[href]:not([aria-disabled="true"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener('cart:open', () => openDrawer());
  document.addEventListener('loomhaus:cart:open', () => openDrawer());
  document.addEventListener('cart:updated', () => {
    getLatestCart().catch(() => {});
  });

  if (
    typeof subscribe === 'function' &&
    typeof PUB_SUB_EVENTS !== 'undefined' &&
    PUB_SUB_EVENTS.cartUpdate
  ) {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      getLatestCart()
        .then(() => {
          if (event?.source === 'product-form') openDrawer();
        })
        .catch(() => {});
    });
  }

  getLatestCart().catch(() => {});
})();
