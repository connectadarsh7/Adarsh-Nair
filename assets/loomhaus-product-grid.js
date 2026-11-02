document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.loomhaus-lookbook').forEach((section) => {

    const modal = section.querySelector('[data-quick-view-modal]');

    if (!modal) return;

    const image = modal.querySelector('[data-quick-image]');
    const title = modal.querySelector('[data-quick-title]');
    const price = modal.querySelector('[data-quick-price]');
    const description = modal.querySelector('[data-quick-description]');

    const colorGroup = modal.querySelector('[data-color-group]');
    const colorOptions = modal.querySelector('[data-color-options]');

    const sizeGroup = modal.querySelector('[data-size-group]');
    const sizeSelect = modal.querySelector('[data-size-select]');

    const otherOptions = modal.querySelector('[data-other-options]');

    const addButton = modal.querySelector('[data-quick-add]');
    const addButtonText = modal.querySelector('[data-quick-add-text]');
    const message = modal.querySelector('[data-quick-message]');

    let activeProduct = null;
    let selectedOptions = [];
    let previousFocus = null;

    const formatMoney = (amount) => {
      return new Intl.NumberFormat(
        document.documentElement.lang || 'en-IN',
        {
          style: 'currency',
          currency: window.Shopify?.currency?.active || 'INR'
        }
      ).format(amount / 100);
    };

    const optionType = (name) => {
      const normalized = name.toLowerCase();

      if (normalized.includes('color') || normalized.includes('colour')) {
        return 'color';
      }

      if (normalized.includes('size')) {
        return 'size';
      }

      return 'other';
    };

    const getSelectedVariant = () => {
      if (!activeProduct) return null;

      return activeProduct.variants.find((variant) => {
        return variant.options.every((option, index) => {
          return option === selectedOptions[index];
        });
      }) || null;
    };

    const updateVariant = () => {
      const variant = getSelectedVariant();

      if (!variant) {
        addButton.disabled = true;
        addButtonText.textContent = 'UNAVAILABLE';
        return;
      }

      price.textContent = formatMoney(variant.price);

      if (variant.featured_image?.src) {
        image.src = variant.featured_image.src;
      }

      if (variant.available) {
        addButton.disabled = false;
        addButtonText.textContent = 'ADD TO CART';
      } else {
        addButton.disabled = true;
        addButtonText.textContent = 'SOLD OUT';
      }

      // Update colour availability based on selected options.
      colorOptions.querySelectorAll('[data-color-value]').forEach((button) => {
        const colorValue = button.dataset.colorValue;
        const colorIndex = button.dataset.optionIndex;

        const matchingVariant = activeProduct.variants.some((item) => {
          return item.options[colorIndex] === colorValue &&
            item.available &&
            item.options.every((option, index) => {
              return index === Number(colorIndex) ||
                index === Number(sizeSelect.dataset.optionIndex) ||
                option === selectedOptions[index];
            });
        });

        button.disabled = !matchingVariant;
      });
    };

    const getColorCode = (color) => {
      const normalized = color.toLowerCase();

      const colors = {
        black: '#222222',
        white: '#ffffff',
        navy: '#172c4b',
        blue: '#315b91',
        red: '#c43d35',
        green: '#4d7554',
        olive: '#777a67',
        grey: '#929292',
        gray: '#929292',
        brown: '#795548',
        beige: '#d8c7a5',
        cream: '#eee5d3',
        yellow: '#e6c34a',
        pink: '#e8a4b7',
        purple: '#8465a7',
        orange: '#d9823b'
      };

      return colors[normalized] || '#dedbd4';
    };

    const createColorOptions = (product, optionIndex) => {
      const values = [...new Set(
        product.variants.map((variant) => variant.options[optionIndex])
      )];

      colorOptions.innerHTML = '';
      colorGroup.hidden = false;

      values.forEach((value) => {
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'loomhaus-quick-view__color';

        button.dataset.colorValue = value;
        button.dataset.optionIndex = optionIndex;

        const dot = document.createElement('span');
        dot.className = 'loomhaus-quick-view__color-dot';
        dot.style.backgroundColor = getColorCode(value);

        const text = document.createElement('span');
        text.textContent = value;

        button.append(dot, text);

        button.addEventListener('click', () => {
          selectedOptions[optionIndex] = value;

          colorOptions.querySelectorAll('.loomhaus-quick-view__color')
            .forEach((item) => {
              item.classList.toggle(
                'is-selected',
                item.dataset.colorValue === value
              );
            });

          updateVariant();
        });

        colorOptions.appendChild(button);
      });

      colorOptions.querySelector(
        '[data-color-value="' + CSS.escape(selectedOptions[optionIndex]) + '"]'
      )?.classList.add('is-selected');
    };

    const createSizeOptions = (product, optionIndex) => {
      const values = [...new Set(
        product.variants.map((variant) => variant.options[optionIndex])
      )];

      sizeSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose your size';

      sizeSelect.appendChild(placeholder);

      values.forEach((value) => {
        const option = document.createElement('option');

        option.value = value;
        option.textContent = value;

        sizeSelect.appendChild(option);
      });

      sizeSelect.dataset.optionIndex = optionIndex;
      sizeGroup.hidden = false;

      sizeSelect.value = selectedOptions[optionIndex] || '';

      sizeSelect.addEventListener('change', () => {
        selectedOptions[optionIndex] = sizeSelect.value;
        updateVariant();
      });
    };

    const createOtherOptions = (product, optionIndex) => {
      const values = [...new Set(
        product.variants.map((variant) => variant.options[optionIndex])
      )];

      const wrapper = document.createElement('div');
      wrapper.className = 'loomhaus-quick-view__option-group';

      const label = document.createElement('label');
      label.className = 'loomhaus-quick-view__option-label';
      label.textContent = product.options[optionIndex];

      const select = document.createElement('select');

      values.forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });

      select.value = selectedOptions[optionIndex];

      select.addEventListener('change', () => {
        selectedOptions[optionIndex] = select.value;
        updateVariant();
      });

      wrapper.append(label, select);
      otherOptions.appendChild(wrapper);
    };

    const resetOptions = () => {
      colorGroup.hidden = true;
      sizeGroup.hidden = true;

      colorOptions.innerHTML = '';
      sizeSelect.innerHTML = '';
      otherOptions.innerHTML = '';
    };

    const openModal = () => {
      previousFocus = document.activeElement;

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

      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
    };

    const loadProduct = async (url) => {
      openModal();

      title.textContent = '';
      price.textContent = '';
      description.textContent = 'Loading product...';

      image.removeAttribute('src');

      message.textContent = '';
      addButton.disabled = true;
      addButtonText.textContent = 'LOADING...';

      resetOptions();

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

        selectedOptions = [...product.variants[0].options];

        // Start with the first available variant.
        const firstAvailable = product.variants.find(
          (variant) => variant.available
        );

        if (firstAvailable) {
          selectedOptions = [...firstAvailable.options];
        }

        product.options.forEach((optionName, index) => {
          const type = optionType(optionName);

          if (type === 'color') {
            createColorOptions(product, index);
          } else if (type === 'size') {
            createSizeOptions(product, index);
          } else {
            createOtherOptions(product, index);
          }
        });

        updateVariant();

        message.textContent = '';

      } catch (error) {
        console.error(error);

        description.textContent = '';
        message.textContent = 'Unable to load product. Please try again.';

        addButton.disabled = true;
        addButtonText.textContent = 'ADD TO CART';
      }
    };

    // Open quick view from hotspot.
    section.querySelectorAll('[data-quick-view]').forEach((button) => {
      button.addEventListener('click', () => {
        loadProduct(button.dataset.productUrl);
      });
    });

    // Close from close button and overlay.
    modal.querySelectorAll('[data-quick-view-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    // Close using Escape.
    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        modal.classList.contains('is-open')
      ) {
        closeModal();
      }
    });

    // Add selected variant to cart without page reload.
    addButton.addEventListener('click', async () => {
      if (!activeProduct) return;

      const variant = getSelectedVariant();

      if (!variant || !variant.available) return;

      addButton.disabled = true;
      addButtonText.textContent = 'ADDING...';
      message.textContent = '';

      try {
        const root = window.Shopify?.routes?.root || '/';

        const response = await fetch(`${root}cart/add.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            id: variant.id,
            quantity: 1
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || 'Unable to add this product.'
          );
        }

        // Notify the cart drawer and other cart components.
        document.dispatchEvent(
          new CustomEvent('cart:updated', {
            detail: result
          })
        );

        // Close quick view.
        closeModal();

        // Open the Dawn cart drawer if it exists.
        const dawnCartDrawer = document.querySelector('cart-drawer');

        if (dawnCartDrawer && typeof dawnCartDrawer.open === 'function') {
          dawnCartDrawer.open();
        }

        // Notify the custom Loomhaus cart drawer.
        document.dispatchEvent(
          new CustomEvent('cart:open')
        );

      } catch (error) {
        console.error(error);

        message.textContent = error.message;

        addButton.disabled = false;
        addButtonText.textContent = 'ADD TO CART';
      }
    });

  });

});