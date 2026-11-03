
(() => {
  function initFeaturedProduct(section) {
    if (section.dataset.featuredInitialized === 'true') return;
    section.dataset.featuredInitialized = 'true';

    const jsonElement = section.querySelector('[data-featured-product-json]');
    if (!jsonElement) return;

    let product;

    try {
      product = JSON.parse(jsonElement.textContent);
    } catch (error) {
      console.error('Featured product JSON could not be read.', error);
      return;
    }

    const mainImage = section.querySelector('.loomhaus-featured__image');
    const thumbnails = [...section.querySelectorAll('[data-thumbnail]')];
    const previousButton = section.querySelector('[data-gallery-prev]');
    const nextButton = section.querySelector('[data-gallery-next]');

    const priceElement = section.querySelector('[data-featured-price]');
    const compareElement = section.querySelector('[data-featured-compare]');
    const saveElement = section.querySelector('[data-featured-save]');

    const addButton = section.querySelector('[data-featured-add]');
    const buyButton = section.querySelector('[data-featured-buy]');
    const quantityInput = section.querySelector('[data-quantity-input]');
    const message = section.querySelector('[data-featured-message]');

    const optionGroups = [...section.querySelectorAll('[data-option-index]')];

    const initialVariant = product.variants.find(
      (variant) => String(variant.id) === section.dataset.initialVariant
    ) || product.variants.find((variant) => variant.available) || product.variants[0];

    if (!initialVariant) return;

    let selectedOptions = [...initialVariant.options];
    let activeVariant = initialVariant;
    let activeImageIndex = 0;

    const currency = window.Shopify?.currency?.active || 'INR';

    function formatMoney(cents) {
      return new Intl.NumberFormat(
        document.documentElement.lang || 'en-IN',
        {
          style: 'currency',
          currency
        }
      ).format(Number(cents) / 100);
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

    /* IMAGE GALLERY */

    function showImage(index) {
      if (!product.images?.length || !mainImage) return;

      activeImageIndex =
        (index + product.images.length) % product.images.length;

      const imageUrl = getImageUrl(product.images[activeImageIndex]);

      if (imageUrl) {
        mainImage.src = imageUrl;
      }

      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        thumbnail.classList.toggle(
          'is-active',
          thumbnailIndex === activeImageIndex
        );
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

    /* VARIANT OPTIONS */

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
                return index === groupIndex ||
                  selectedOptions[index] === option;
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
      if (!variant) return;

      priceElement.textContent = formatMoney(variant.price);

      if (variant.compare_at_price > variant.price) {
        compareElement.hidden = false;
        compareElement.textContent = formatMoney(variant.compare_at_price);

        const savings = Math.round(
          ((variant.compare_at_price - variant.price) /
            variant.compare_at_price) * 100
        );

        saveElement.hidden = false;
        saveElement.textContent = `SAVE ${savings}%`;
      } else {
        compareElement.hidden = true;
        saveElement.hidden = true;
      }
    }

    /* OFFER PRICES */

    function updateOfferPrices(variant) {
      if (!variant) return;

      const discountOne = Number(section.dataset.offerDiscountOne || 10);
      const discountTwo = Number(section.dataset.offerDiscountTwo || 15);

      const offerOne = section.querySelector('[data-offer-price-one]');
      const offerTwo = section.querySelector('[data-offer-price-two]');

      if (offerOne) {
        const discountedPrice = Math.round(
          variant.price * (1 - discountOne / 100)
        );

        offerOne.textContent = `Get it for ${formatMoney(discountedPrice)}`;
      }

      if (offerTwo) {
        const discountedPrice = Math.round(
          variant.price * (1 - discountTwo / 100)
        );

        offerTwo.textContent = `Get it for ${formatMoney(discountedPrice)}`;
      }
    }

    function updateVariant() {
      activeVariant = getSelectedVariant();

      updateOptionButtons();

      if (!activeVariant) {
        addButton.disabled = true;
        buyButton.disabled = true;
        addButton.textContent = 'UNAVAILABLE';
        message.textContent = 'This combination is unavailable.';
        return;
      }

      updatePrice(activeVariant);
      updateOfferPrices(activeVariant);

      const available = activeVariant.available;

      addButton.disabled = !available;
      buyButton.disabled = !available;
      addButton.textContent = available ? 'ADD TO CART →' : 'SOLD OUT';

      message.textContent = '';

      if (activeVariant.featured_image?.src && mainImage) {
        mainImage.src = activeVariant.featured_image.src;
      }

      const url = new URL(window.location.href);
      url.searchParams.set('variant', activeVariant.id);
      window.history.replaceState({}, '', url);
    }

    optionGroups.forEach((group, groupIndex) => {
      group.querySelectorAll('[data-option-value]').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.disabled) return;

          selectedOptions[groupIndex] = button.dataset.optionValue;

          // Find a valid available variant matching the changed option.
          const matchingVariant = product.variants.find((variant) => {
            return variant.available &&
              variant.options[groupIndex] === selectedOptions[groupIndex] &&
              variant.options.every((value, index) => {
                return index === groupIndex ||
                  selectedOptions[index] === value;
              });
          });

          // If the previous combination is no longer valid,
          // select the first available matching combination.
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

    /* QUANTITY */

    section.querySelector('[data-quantity-minus]')?.addEventListener('click', () => {
      const quantity = Math.max(1, Number(quantityInput.value) || 1);
      quantityInput.value = Math.max(1, quantity - 1);
    });

    section.querySelector('[data-quantity-plus]')?.addEventListener('click', () => {
      const quantity = Math.max(1, Number(quantityInput.value) || 1);
      quantityInput.value = quantity + 1;
    });

    quantityInput?.addEventListener('change', () => {
      quantityInput.value = Math.max(1, Number(quantityInput.value) || 1);
    });

    /* ADD TO CART AND BUY IT NOW */

    async function addProductToCart(redirectToCheckout = false) {
      if (!activeVariant || !activeVariant.available) return;

      const quantity = Math.max(1, Number(quantityInput.value) || 1);
      const root = window.Shopify?.routes?.root || '/';

      addButton.disabled = true;
      buyButton.disabled = true;
      addButton.textContent = 'ADDING...';
      message.textContent = '';

      try {
        const response = await fetch(`${root}cart/add.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            id: activeVariant.id,
            quantity
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || result.message || 'Unable to add product.'
          );
        }

        if (redirectToCheckout) {
          window.location.href = `${root}checkout`;
          return;
        }

        addButton.textContent = 'ADDED TO CART';
        message.textContent = 'Product added to cart.';

        // Custom cart drawer can listen for this event.
        document.dispatchEvent(
          new CustomEvent('loomhaus:cart:open', {
            detail: {
              item: result,
              variant: activeVariant,
              quantity
            }
          })
        );

        document.dispatchEvent(
          new CustomEvent('loomhaus:cart:updated', {
            detail: result
          })
        );

        // Notify cart icon or header components.
        const cartResponse = await fetch(`${root}cart.js`);
        const cart = await cartResponse.json();

        document.dispatchEvent(
          new CustomEvent('loomhaus:cart:count', {
            detail: { itemCount: cart.item_count }
          })
        );

      } catch (error) {
        console.error(error);
        message.textContent = error.message;
        addButton.textContent = 'ADD TO CART →';
      } finally {
        if (activeVariant) {
          addButton.disabled = !activeVariant.available;
          buyButton.disabled = !activeVariant.available;
        }
      }
    }

    addButton?.addEventListener('click', () => {
      addProductToCart(false);
    });

    buyButton?.addEventListener('click', () => {
      addProductToCart(true);
    });

    /* COPY OFFER CODE */

    section.querySelectorAll('[data-copy-code]').forEach((button) => {
      button.addEventListener('click', async () => {
        const code = button.dataset.copyCode;

        if (!code) return;

        try {
          await navigator.clipboard.writeText(code);

          const originalText = button.textContent;
          button.textContent = 'COPIED';

          window.setTimeout(() => {
            button.textContent = originalText;
          }, 1200);

        } catch (error) {
          console.error('Unable to copy discount code.', error);
          message.textContent = 'Unable to copy the offer code.';
        }
      });
    });

    /* INITIALIZE */

    updateVariant();
    showImage(0);
  }

  function initAllFeaturedProducts() {
    document.querySelectorAll('[data-featured-product]').forEach((section) => {
      initFeaturedProduct(section);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllFeaturedProducts);
  } else {
    initAllFeaturedProducts();
  }

  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-featured-product]').forEach((section) => {
      section.dataset.featuredInitialized = 'false';
      initFeaturedProduct(section);
    });
  });
})();
