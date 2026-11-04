
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.loomhaus-lookbook').forEach((section) => {
    const modal = section.querySelector('[data-quick-view-modal]');
    if (!modal) return;

    const panel = modal.querySelector('.loomhaus-quick-view__panel');
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
    const productLink = modal.querySelector('[data-quick-product-link]');
    const message = modal.querySelector('[data-quick-message]');

    let activeProduct = null;
    let selectedOptions = {};
    let lastFocusedElement = null;

    const getOptionNames = (product) => {
      return (product?.options || []).map((option) => {
        return typeof option === 'string' ? option : option.name;
      });
    };

    const money = (amount) => {
      const currency = window.Shopify?.currency?.active || 'INR';

      return new Intl.NumberFormat(
        document.documentElement.lang || 'en-IN',
        {
          style: 'currency',
          currency
        }
      ).format(Number(amount) / 100);
    };

    const getOptionIndex = (names, keywords) => {
      return names.findIndex((name) =>
        keywords.some((keyword) =>
          name.toLowerCase().includes(keyword)
        )
      );
    };

    const getSelectedVariant = () => {
      if (!activeProduct) return null;

      const optionNames = getOptionNames(activeProduct);

      return activeProduct.variants.find((variant) => {
        return variant.options.every((value, index) => {
          const optionName = optionNames[index];

          return selectedOptions[optionName] === value;
        });
      }) || null;
    };

    const updateVariantState = () => {
      const variant = getSelectedVariant();

      if (variant) {
        price.textContent = money(variant.price);
      }

      const isAvailable = Boolean(variant && variant.available);

      addButton.disabled = !isAvailable;

      if (addButtonText) {
        addButtonText.textContent = isAvailable
          ? 'ADD TO CART'
          : variant
            ? 'SOLD OUT'
            : 'CHOOSE OPTIONS';
      }

      if (variant && variant.featured_image?.src) {
        image.src = variant.featured_image.src;
      }
    };

    const createColorOptions = (optionName, values) => {
      colorOptions.innerHTML = '';
      colorGroup.hidden = false;

      values.forEach((value) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'loomhaus-quick-view__color-button';

        const dot = document.createElement('span');
        dot.className = 'loomhaus-quick-view__color-dot';

        const normalized = value.toLowerCase();

        if (
          normalized.includes('black') ||
          normalized.includes('navy')
        ) {
          dot.classList.add('is-dark');
        }

        const text = document.createElement('span');
        text.textContent = value;

        button.append(dot, text);

        if (selectedOptions[optionName] === value) {
          button.classList.add('is-selected');
        }
        button.setAttribute(
          'aria-pressed',
          String(selectedOptions[optionName] === value)
        );

        button.addEventListener('click', () => {
          selectedOptions[optionName] = value;

          colorOptions
            .querySelectorAll('.loomhaus-quick-view__color-button')
            .forEach((item) => {
              const isSelected = item === button;
              item.classList.toggle('is-selected', isSelected);
              item.setAttribute('aria-pressed', String(isSelected));
            });

          updateSizeOptions();
          updateVariantState();
        });

        colorOptions.appendChild(button);
      });
    };

    const updateSizeOptions = () => {
      if (!activeProduct) return;

      const names = getOptionNames(activeProduct);
      const sizeIndex = getOptionIndex(names, ['size']);

      if (sizeIndex === -1) {
        sizeGroup.hidden = true;
        return;
      }

      const sizeName = names[sizeIndex];
      const sizeValues = [
        ...new Set(activeProduct.variants.map((variant) =>
          variant.options[sizeIndex]
        ))
      ];

      const colorIndex = getOptionIndex(names, ['color', 'colour']);

      const availableSizes = sizeValues.filter((size) => {
        return activeProduct.variants.some((variant) => {
          const matchesColor = colorIndex === -1 ||
            variant.options[colorIndex] === selectedOptions[names[colorIndex]];

          return matchesColor &&
            variant.options[sizeIndex] === size &&
            variant.available;
        });
      });

      sizeSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Choose your size';
      sizeSelect.appendChild(placeholder);

      sizeValues.forEach((size) => {
        const option = document.createElement('option');
        option.value = size;
        option.textContent = size;
        option.disabled = !availableSizes.includes(size);
        sizeSelect.appendChild(option);
      });

      if (
        selectedOptions[sizeName] &&
        availableSizes.includes(selectedOptions[sizeName])
      ) {
        sizeSelect.value = selectedOptions[sizeName];
      } else {
        selectedOptions[sizeName] = '';
        sizeSelect.value = '';
      }

      sizeGroup.hidden = false;
    };

    const createOtherOptions = () => {
      otherOptions.innerHTML = '';
      const optionNames = getOptionNames(activeProduct);

      optionNames.forEach((optionName, index) => {
        const lowerName = optionName.toLowerCase();

        if (
          lowerName.includes('color') ||
          lowerName.includes('colour') ||
          lowerName.includes('size')
        ) {
          return;
        }

        const values = [
          ...new Set(activeProduct.variants.map((variant) =>
            variant.options[index]
          ))
        ];

        const group = document.createElement('div');
        group.className = 'loomhaus-quick-view__option-group';

        const label = document.createElement('label');
        label.className = 'loomhaus-quick-view__option-label';
        label.textContent = optionName.toUpperCase();

        const select = document.createElement('select');
        select.className = 'loomhaus-quick-view__select';

        values.forEach((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });

        selectedOptions[optionName] = values[0];

        select.value = values[0];

        select.addEventListener('change', () => {
          selectedOptions[optionName] = select.value;
          updateVariantState();
        });

        group.append(label, select);
        otherOptions.appendChild(group);
      });
    };

    const renderProduct = (product) => {
      activeProduct = product;
      selectedOptions = {};

      title.textContent = product.title;
      price.textContent = money(product.price);

      description.textContent = product.description
        ? product.description
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      image.src = product.featured_image || product.images?.[0] || '';
      image.alt = product.title;

      if (productLink) {
        productLink.href = product.url;
      }

      const names = getOptionNames(product);
      const colorIndex = getOptionIndex(names, ['color', 'colour']);
      const sizeIndex = getOptionIndex(names, ['size']);

      names.forEach((name, index) => {
        if (index === colorIndex) {
          const values = [
            ...new Set(product.variants.map((variant) =>
              variant.options[index]
            ))
          ];

          const firstAvailable = product.variants.find(
            (variant) => variant.available
          );

          selectedOptions[name] = firstAvailable
            ? firstAvailable.options[index]
            : values[0];

          createColorOptions(name, values);
        } else if (index === sizeIndex) {
          selectedOptions[name] = '';
        }
      });

      if (colorIndex === -1) {
        colorGroup.hidden = true;
      }

      if (sizeIndex === -1) {
        sizeGroup.hidden = true;
      }

      createOtherOptions();
      updateSizeOptions();
      updateVariantState();
    };

    const openModal = () => {
      lastFocusedElement = document.activeElement;

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      panel?.focus();
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.classList.remove('is-loading');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';

      activeProduct = null;

      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    };

    const loadProduct = async (url) => {
      message.textContent = 'Loading product...';
      addButton.disabled = true;

      modal.classList.add('is-loading');
      openModal();

      try {
        const response = await fetch(`${url}.js`);

        if (!response.ok) {
          throw new Error('Unable to load this product.');
        }

        const product = await response.json();

        renderProduct(product);

        modal.classList.remove('is-loading');
        message.textContent = '';
      } catch (error) {
        console.error(error);
        modal.classList.remove('is-loading');
        message.textContent = 'Unable to load product. Please try again.';
      }
    };

    // Open quick view
    section.querySelectorAll('[data-quick-view]').forEach((button) => {
      button.addEventListener('click', () => {
        loadProduct(button.dataset.productUrl);
      });
    });

    // Close buttons and overlay
    modal.querySelectorAll('[data-quick-view-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    // Close on Escape
    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        modal.classList.contains('is-open')
      ) {
        closeModal();
      }
    });

    // Size selection
    sizeSelect.addEventListener('change', () => {
      if (!activeProduct) return;

      const sizeIndex = getOptionIndex(getOptionNames(activeProduct), ['size']);

      if (sizeIndex === -1) return;

      const sizeName = getOptionNames(activeProduct)[sizeIndex];
      selectedOptions[sizeName] = sizeSelect.value;

      updateVariantState();
    });

    // Add selected variant to cart without page reload
    addButton.addEventListener('click', async () => {
      const variant = getSelectedVariant();

      if (!variant || !variant.available) return;

      addButton.disabled = true;

      if (addButtonText) {
        addButtonText.textContent = 'ADDING...';
      }

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

        // Notify the Loomhaus cart drawer.
        document.dispatchEvent(
          new CustomEvent('cart:updated', {
            detail: result
          })
        );

        document.dispatchEvent(
          new CustomEvent('cart:open', {
            detail: result
          })
        );

        if (addButtonText) {
          addButtonText.textContent = 'ADDED TO CART';
        }

        message.textContent = 'Product added to cart.';

        // Close quick view after successful add
        closeModal();

      } catch (error) {
        console.error(error);
        message.textContent = error.message;
        addButton.disabled = false;

        if (addButtonText) {
          addButtonText.textContent = 'ADD TO CART';
        }
      }
    });
  });
});
