(() => {
  function initFeaturedProduct(section) {
    if (section.dataset.featuredInitialized === 'true') return;

    const jsonElement = section.querySelector('[data-featured-product-json]');
    if (!jsonElement) return;

    let product;

    try {
      product = JSON.parse(jsonElement.textContent);
    } catch (error) {
      console.error('Featured product JSON could not be read.', error);
      return;
    }

    if (!Array.isArray(product.variants) || product.variants.length === 0) {
      console.error('Featured product has no variants to select.');
      return;
    }

    product.variants = product.variants.map((variant) => ({
      ...variant,
      options: Array.isArray(variant.options)
        ? variant.options
        : [variant.option1, variant.option2, variant.option3]
          .filter((option) => option !== null && option !== undefined)
    }));

    const mainImage = section.querySelector('.loomhaus-featured__image');
    const thumbnails = [...section.querySelectorAll('[data-thumbnail]')];
    const previousButton = section.querySelector('[data-gallery-prev]');
    const nextButton = section.querySelector('[data-gallery-next]');
    const priceElement = section.querySelector('[data-featured-price]');
    const compareElement = section.querySelector('[data-featured-compare]');
    const saveElement = section.querySelector('[data-featured-save]');
    const addButton = section.querySelector('[data-featured-add]');
    const addButtonText = section.querySelector('[data-featured-add-text]');
    const buyButton = section.querySelector('[data-featured-buy]');
    const quantityInput = section.querySelector('[data-quantity-input]');
    const message = section.querySelector('[data-featured-message]');
    const optionGroups = [...section.querySelectorAll('[data-option-index]')];

    if (
      !priceElement ||
      !compareElement ||
      !saveElement ||
      !addButton ||
      !buyButton ||
      !quantityInput ||
      !message
    ) {
      console.error('Featured product section is missing required controls.');
      return;
    }

    const initialVariant = product.variants.find(
      (variant) => String(variant.id) === section.dataset.initialVariant
    ) || product.variants.find((variant) => variant.available) || product.variants[0];

    let selectedOptions = [...initialVariant.options];
    let activeVariant = initialVariant;
    let activeImageIndex = 0;
    let addedTextTimer;
    section.dataset.featuredInitialized = 'true';

    const labels = {
      add: section.dataset.addLabel || 'ADD TO CART',
      soldOut: section.dataset.soldOutLabel || 'SOLD OUT',
      adding: section.dataset.addingLabel || 'ADDING...',
      added: section.dataset.addedLabel || 'ADDED TO CART',
      unavailable: section.dataset.unavailableLabel || 'UNAVAILABLE',
      save: section.dataset.saveLabel || 'SAVE'
    };
    const currency = window.Shopify?.currency?.active || 'INR';
    const locale = document.documentElement.lang || 'en-IN';
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    });

    function formatMoney(cents) {
      return formatter.format(Number(cents) / 100);
    }

    function getSelectedVariant() {
      return product.variants.find((variant) => {
        return variant.options.every((value, index) => {
          return value === selectedOptions[index];
        });
      }) || null;
    }

    function getImageUrl(image) {
      if (!image) return '';
      if (typeof image === 'string') return image;
      return image.src || '';
    }

    function normalizeImageUrl(url) {
      if (!url) return '';

      try {
        const parsedUrl = new URL(url, window.location.origin);
        return `${parsedUrl.origin}${parsedUrl.pathname}`;
      } catch (error) {
        return url.split('?')[0];
      }
    }

    function showImage(index) {
      const images = product.images || [];
      if (!images.length || !mainImage) return;

      activeImageIndex = (index + images.length) % images.length;
      const imageUrl = getImageUrl(images[activeImageIndex]);

      if (imageUrl) {
        mainImage.src = imageUrl;
        mainImage.removeAttribute('srcset');
        mainImage.alt = thumbnails[activeImageIndex]?.dataset.imageAlt || product.title;
      }

      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        const selected = thumbnailIndex === activeImageIndex;
        thumbnail.classList.toggle('is-active', selected);
        thumbnail.setAttribute('aria-pressed', String(selected));
      });
    }

    thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener('click', () => {
        showImage(Number(thumbnail.dataset.imageIndex));
      });
    });

    previousButton?.addEventListener('click', () => {
      showImage(activeImageIndex - 1);
    });

    nextButton?.addEventListener('click', () => {
      showImage(activeImageIndex + 1);
    });

    function updateOptionButtons() {
      optionGroups.forEach((group, groupIndex) => {
        const buttons = group.querySelectorAll('[data-option-value]');
        const selectedText = group.querySelector('[data-selected-option]');

        buttons.forEach((button) => {
          const value = button.dataset.optionValue;
          const selected = selectedOptions[groupIndex] === value;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));

          const available = product.variants.some((variant) => {
            return variant.available &&
              variant.options[groupIndex] === value &&
              variant.options.every((option, index) => {
                return index === groupIndex || selectedOptions[index] === option;
              });
          });

          button.disabled = !available;
        });

        if (selectedText) {
          selectedText.textContent = selectedOptions[groupIndex] || '';
        }
      });
    }

    function updatePrice(variant) {
      priceElement.textContent = formatMoney(variant.price);

      if (variant.compare_at_price > variant.price) {
        compareElement.hidden = false;
        compareElement.textContent = formatMoney(variant.compare_at_price);

        const savings = Math.round(
          ((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100
        );

        saveElement.hidden = false;
        saveElement.textContent = `${labels.save} ${savings}%`;
      } else {
        compareElement.hidden = true;
        saveElement.hidden = true;
      }
    }

    function updateOfferPrices(variant) {
      section.querySelectorAll('[data-offer-price], [data-offer-price-one], [data-offer-price-two]')
        .forEach((offer) => {
          const discount = Number(offer.dataset.offerDiscount || 0);
          const discountedPrice = Math.round(variant.price * (1 - discount / 100));
          offer.textContent = `Get it for ${formatMoney(discountedPrice)}`;
        });
    }

    function updateFeaturedImage(variant) {
      const variantImage = getImageUrl(variant.featured_image);
      if (!variantImage || !product.images?.length) return;

      const variantImageUrl = normalizeImageUrl(variantImage);
      const matchingIndex = product.images.findIndex((image) => {
        return normalizeImageUrl(getImageUrl(image)) === variantImageUrl;
      });

      if (matchingIndex !== -1) {
        showImage(matchingIndex);
      } else if (mainImage) {
        mainImage.src = variantImage;
        mainImage.removeAttribute('srcset');
      }
    }

    function updateVariantUrl(variant) {
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }

    function getQuantity() {
      return Math.max(1, Math.floor(Number(quantityInput.value) || 1));
    }

    function updateVariant() {
      window.clearTimeout(addedTextTimer);
      activeVariant = getSelectedVariant();
      updateOptionButtons();

      if (!activeVariant) {
        addButton.disabled = true;
        buyButton.disabled = true;
        if (addButtonText) addButtonText.textContent = labels.unavailable;
        message.textContent = 'This combination is unavailable.';
        return;
      }

      updatePrice(activeVariant);
      updateOfferPrices(activeVariant);
      updateFeaturedImage(activeVariant);

      const available = activeVariant.available;
      addButton.disabled = !available;
      buyButton.disabled = !available;

      if (addButtonText) {
        addButtonText.textContent = available ? labels.add : labels.soldOut;
      }

      message.textContent = '';
      updateVariantUrl(activeVariant);
    }

    optionGroups.forEach((group, groupIndex) => {
      group.querySelectorAll('[data-option-value]').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.disabled) return;

          selectedOptions[groupIndex] = button.dataset.optionValue;

          const matchingVariant = product.variants.find((variant) => {
            return variant.available &&
              variant.options[groupIndex] === selectedOptions[groupIndex] &&
              variant.options.every((value, index) => {
                return index === groupIndex || selectedOptions[index] === value;
              });
          });

          if (!matchingVariant) {
            const fallbackVariant = product.variants.find((variant) => {
              return variant.available &&
                variant.options[groupIndex] === selectedOptions[groupIndex];
            });

            if (fallbackVariant) {
              selectedOptions = [...fallbackVariant.options];
            }
          }

          updateVariant();
        });
      });
    });

    section.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
      const quantity = getQuantity();
      quantityInput.value = String(Math.max(1, quantity - 1));
    });

    section.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
      const quantity = getQuantity();
      quantityInput.value = String(quantity + 1);
    });

    quantityInput.addEventListener('change', () => {
      quantityInput.value = String(getQuantity());
    });

    async function addProductToCart(redirectToCheckout = false) {
      if (!activeVariant || !activeVariant.available || addButton.disabled) return;

      const quantity = getQuantity();
      const root = window.Shopify?.routes?.root || '/';
      const shopRoot = root.endsWith('/') ? root : `${root}/`;

      addButton.disabled = true;
      buyButton.disabled = true;
      addButton.setAttribute('aria-busy', 'true');
      if (addButtonText) addButtonText.textContent = labels.adding;
      message.textContent = '';

      try {
        const response = await fetch(`${shopRoot}cart/add.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            id: activeVariant.id,
            quantity
          })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || result.message || 'Unable to add product to cart.'
          );
        }

        if (redirectToCheckout) {
          window.location.assign(`${shopRoot}checkout`);
          return;
        }

        message.textContent = 'Product added to cart.';
        if (addButtonText) addButtonText.textContent = labels.added;

        document.dispatchEvent(new CustomEvent('loomhaus:cart:open', {
          detail: {
            item: result,
            variant: activeVariant,
            quantity
          }
        }));
        document.dispatchEvent(new CustomEvent('loomhaus:cart:updated', {
          detail: result
        }));
        document.dispatchEvent(new CustomEvent('cart:updated', {
          detail: result
        }));

        try {
          const cartResponse = await fetch(`${shopRoot}cart.js`, {
            headers: { Accept: 'application/json' }
          });

          if (!cartResponse.ok) {
            throw new Error('Unable to refresh the cart count.');
          }

          const cart = await cartResponse.json();
          document.dispatchEvent(new CustomEvent('loomhaus:cart:count', {
            detail: { itemCount: cart.item_count }
          }));
        } catch (error) {
          console.error('Loomhaus featured product cart count error:', error);
        }

        addedTextTimer = window.setTimeout(() => {
          if (addButtonText) {
            addButtonText.textContent = activeVariant?.available ? labels.add : labels.soldOut;
          }
        }, 1600);
      } catch (error) {
        console.error('Loomhaus featured product cart error:', error);
        message.textContent = error.message || 'Unable to add product to cart. Please try again.';
        if (addButtonText) addButtonText.textContent = labels.add;
      } finally {
        addButton.removeAttribute('aria-busy');
        addButton.disabled = !activeVariant?.available;
        buyButton.disabled = !activeVariant?.available;
      }
    }

    addButton.addEventListener('click', () => {
      addProductToCart(false);
    });

    buyButton.addEventListener('click', () => {
      addProductToCart(true);
    });

    async function copyText(text) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }

      const temporaryInput = document.createElement('textarea');
      temporaryInput.value = text;
      temporaryInput.setAttribute('readonly', '');
      temporaryInput.style.position = 'absolute';
      temporaryInput.style.left = '-9999px';
      document.body.appendChild(temporaryInput);
      temporaryInput.select();

      let copied;
      try {
        copied = document.execCommand('copy');
      } finally {
        temporaryInput.remove();
      }

      if (!copied) {
        throw new Error('Copying is not supported by this browser.');
      }
    }

    section.querySelectorAll('[data-copy-code]').forEach((button) => {
      button.addEventListener('click', async () => {
        const code = button.dataset.copyCode;
        if (!code) return;

        const originalLabel = button.getAttribute('aria-label');

        try {
          await copyText(code);
          button.classList.add('is-copied');
          button.setAttribute('aria-label', `Offer code ${code} copied`);
          message.textContent = `Offer code ${code} copied.`;
          window.setTimeout(() => {
            button.classList.remove('is-copied');
            if (originalLabel) button.setAttribute('aria-label', originalLabel);
          }, 1200);
        } catch (error) {
          console.error('Unable to copy discount code.', error);
          message.textContent = 'Unable to copy the offer code.';
        }
      });
    });

    updateVariant();
    const variantImage = getImageUrl(initialVariant.featured_image);
    const initialImageIndex = (product.images || []).findIndex((image) => {
      return normalizeImageUrl(getImageUrl(image)) === normalizeImageUrl(variantImage);
    });
    showImage(initialImageIndex > -1 ? initialImageIndex : 0);
  }

  function initAllFeaturedProducts() {
    document.querySelectorAll('[data-featured-product]').forEach(initFeaturedProduct);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFeaturedProducts, { once: true });
  } else {
    initAllFeaturedProducts();
  }

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target.matches?.('[data-featured-product]')) {
      initFeaturedProduct(event.target);
      return;
    }

    event.target.querySelectorAll?.('[data-featured-product]').forEach(initFeaturedProduct);
  });
})();
