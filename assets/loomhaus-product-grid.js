document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.loomhaus-lookbook').forEach((section) => {
    const modal = section.querySelector('[data-quick-view-modal]');
    if (!modal) return;

    const image = modal.querySelector('[data-quick-image]');
    const title = modal.querySelector('[data-quick-title]');
    const price = modal.querySelector('[data-quick-price]');
    const description = modal.querySelector('[data-quick-description]');
    const optionsContainer = modal.querySelector('[data-quick-options]');
    const addButton = modal.querySelector('[data-quick-add]');
    const addButtonText = modal.querySelector('[data-quick-add-text]');
    const message = modal.querySelector('[data-quick-message]');

    let activeProduct = null;
    let selectedOptions = [];
    let selectedVariant = null;
    let lastFocusedElement = null;

    const formatMoney = (amount) => {
      return new Intl.NumberFormat(
        document.documentElement.lang || 'en-IN',
        {
          style: 'currency',
          currency: window.Shopify?.currency?.active || 'INR'
        }
      ).format(amount / 100);
    };

    const getOptionName = (option) => {
      return typeof option === 'string' ? option : option.name;
    };

    const getColorValue = (value) => {
      const colors = {
        black: '#222222',
        white: '#ffffff',
        navy: '#172b4d',
        blue: '#245b9e',
        red: '#c0392b',
        green: '#47734b',
        olive: '#777a67',
        grey: '#999999',
        gray: '#999999',
        brown: '#795548',
        beige: '#d8c7a5',
        cream: '#f2ead8',
        yellow: '#e5c441',
        pink: '#e8a2b2'
      };

      const normalized = value.toLowerCase().trim();

      return colors[normalized] || '#e5dfd4';
    };

    const openModal = () => {
      lastFocusedElement = document.activeElement;

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      modal.querySelector('.loomhaus-quick-view__close')?.focus();
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      activeProduct = null;
      selectedVariant = null;
      selectedOptions = [];

      lastFocusedElement?.focus();
    };

    const getMatchingVariant = () => {
      if (!activeProduct) return null;

      return activeProduct.variants.find((variant) => {
        return variant.options.every((value, index) => {
          return value === selectedOptions[index];
        });
      }) || null;
    };

    const updateVariant = () => {
      selectedVariant = getMatchingVariant();

      if (selectedVariant) {
        price.textContent = formatMoney(selectedVariant.price);

        const available = selectedVariant.available;

        addButton.disabled = !available;
        addButtonText.textContent = available ? 'ADD TO CART' : 'SOLD OUT';
      } else {
        addButton.disabled = true;
        addButtonText.textContent = 'UNAVAILABLE';
      }

      // Update which colour and dropdown options are available
      optionsContainer.querySelectorAll('[data-option-index]').forEach((group) => {
        const optionIndex = Number(group.dataset.optionIndex);

        group.querySelectorAll('[data-option-value]').forEach((control) => {
          const value = control.dataset.optionValue;

          const hasAvailableVariant = activeProduct.variants.some((variant) => {
            return variant.available &&
              variant.options[optionIndex] === value &&
              variant.options.every((optionValue, index) => {
                return index === optionIndex ||
                  optionValue === selectedOptions[index];
              });
          });

          control.disabled = !hasAvailableVariant;
        });
      });
    };

    const renderOptions = (product) => {
      optionsContainer.innerHTML = '';

      const optionNames = product.options || [];

      optionNames.forEach((option, index) => {
        const optionName = getOptionName(option);
        const isColor = /colou?r/i.test(optionName);

        const values = [
          ...new Set(
            product.variants.map((variant) => variant.options[index])
          )
        ];

        const group = document.createElement('div');
        group.className = 'loomhaus-quick-view__option-group';
        group.dataset.optionIndex = index;

        const label = document.createElement('span');
        label.className = 'loomhaus-quick-view__option-label';
        label.textContent = isColor ? 'COLOR' : optionName.toUpperCase();

        group.appendChild(label);

        if (isColor) {
          const colorOptions = document.createElement('div');
          colorOptions.className = 'loomhaus-quick-view__color-options';

          values.forEach((value) => {
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'loomhaus-quick-view__color-button';
            button.dataset.optionValue = value;

            if (selectedOptions[index] === value) {
              button.classList.add('is-selected');
            }

            const dot = document.createElement('span');
            dot.className = 'loomhaus-quick-view__color-dot';
            dot.style.backgroundColor = getColorValue(value);

            const text = document.createElement('span');
            text.textContent = value;

            button.append(dot, text);

            button.addEventListener('click', () => {
              selectedOptions[index] = value;

              colorOptions.querySelectorAll('button').forEach((item) => {
                item.classList.toggle(
                  'is-selected',
                  item.dataset.optionValue === value
                );
              });

              updateVariant();
            });

            colorOptions.appendChild(button);
          });

          group.appendChild(colorOptions);
        } else {
          const select = document.createElement('select');

          select.className = 'loomhaus-quick-view__select';
          select.dataset.optionIndex = index;

          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = `Choose your ${optionName.toLowerCase()}`;
          placeholder.disabled = true;

          select.appendChild(placeholder);

          values.forEach((value) => {
            const optionElement = document.createElement('option');

            optionElement.value = value;
            optionElement.textContent = value;
            optionElement.dataset.optionValue = value;

            select.appendChild(optionElement);
          });

          select.value = selectedOptions[index] || '';

          select.addEventListener('change', () => {
            selectedOptions[index] = select.value;
            updateVariant();
          });

          group.appendChild(select);
        }

        optionsContainer.appendChild(group);
      });

      updateVariant();
    };

    const loadProduct = async (url) => {
      message.textContent = 'Loading product...';
      addButton.disabled = true;
      addButtonText.textContent = 'LOADING...';

      openModal();

      try {
        const response = await fetch(`${url}.js`);

        if (!response.ok) {
          throw new Error('Unable to load this product.');
        }

        const product = await response.json();
        activeProduct = product;

        title.textContent = product.title;

        description.textContent = product.description
          ? product.description
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
          : '';

        image.src = product.featured_image || product.images[0] || '';
        image.alt = product.title;

        // Select the first available variant by default
        const firstAvailable = product.variants.find(
          (variant) => variant.available
        );

        const initialVariant = firstAvailable || product.variants[0];

        selectedOptions = initialVariant
          ? [...initialVariant.options]
          : [];

        renderOptions(product);

        message.textContent = '';
      } catch (error) {
        console.error(error);
        message.textContent = 'Unable to load product. Please try again.';
        addButton.disabled = true;
        addButtonText.textContent = 'ADD TO CART';
      }
    };

    // Open quick view from hotspot
    section.querySelectorAll('[data-quick-view]').forEach((button) => {
      button.addEventListener('click', () => {
        loadProduct(button.dataset.productUrl);
      });
    });

    // Close button and outside click
    modal.querySelectorAll('[data-quick-view-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    // Escape key
    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        modal.classList.contains('is-open')
      ) {
        closeModal();
      }
    });

    // Add selected variant to cart without page reload
    addButton.addEventListener('click', async () => {
      if (!activeProduct || !selectedVariant || !selectedVariant.available) {
        return;
      }

      addButton.disabled = true;
      addButtonText.textContent = 'ADDING...';
      message.textContent = '';

      try {
        const cartDrawer = document.querySelector('cart-drawer');

        const sections = cartDrawer?.getSectionsToRender?.()
          .map((section) => section.id) || [];

        const response = await fetch(
          `${window.Shopify?.routes?.root || '/'}cart/add.js`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json'
            },
            body: JSON.stringify({
              id: Number(selectedVariant.id),
              quantity: 1,
              sections,
              sections_url: window.location.pathname
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || 'Unable to add this product.'
          );
        }

        addButtonText.textContent = 'ADDED TO CART';

        // Refresh and open Dawn's cart drawer when available
        if (cartDrawer) {
          if (typeof cartDrawer.renderContents === 'function') {
            cartDrawer.renderContents(result);
          } else if (typeof cartDrawer.open === 'function') {
            cartDrawer.open();
          }
        }

        // Also notify a custom cart drawer if you add one
        document.dispatchEvent(
          new CustomEvent('cart:updated', { detail: result })
        );

        document.dispatchEvent(
          new CustomEvent('cart:open', { detail: result })
        );

        message.textContent = 'Added to cart.';

        // Close quick view after adding
        closeModal();

      } catch (error) {
        console.error(error);

        message.textContent = error.message;
        addButton.disabled = false;
        addButtonText.textContent = 'ADD TO CART';
      }
    });
  });
});