
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.loomhaus-lookbook').forEach((section) => {
    const modal = section.querySelector('[data-quick-view-modal]');
    if (!modal) return;

    const image = modal.querySelector('[data-quick-image]');
    const title = modal.querySelector('[data-quick-title]');
    const price = modal.querySelector('[data-quick-price]');
    const description = modal.querySelector('[data-quick-description]');
    const variantSelect = modal.querySelector('[data-quick-variant]');
    const addButton = modal.querySelector('[data-quick-add]');
    const productLink = modal.querySelector('[data-quick-product-link]');
    const message = modal.querySelector('[data-quick-message]');

    let activeProduct = null;

    const formatMoney = (amount) => {
      return new Intl.NumberFormat(
        document.documentElement.lang || 'en-IN',
        {
          style: 'currency',
          currency: window.Shopify?.currency?.active || 'INR'
        }
      ).format(amount / 100);
    };

    const openModal = () => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      modal.querySelector('[data-quick-view-close]')?.focus();
    };

    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      activeProduct = null;
    };

    const loadProduct = async (url) => {
      message.textContent = 'Loading product...';
      addButton.disabled = true;
      openModal();

      try {
        const response = await fetch(`${url}.js`);

        if (!response.ok) {
          throw new Error('Unable to load this product.');
        }

        const product = await response.json();
        activeProduct = product;

        title.textContent = product.title;
        price.textContent = formatMoney(product.price);
        description.textContent = product.description
          ? product.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : '';

        image.src = product.featured_image || product.images[0] || '';
        image.alt = product.title;

        productLink.href = product.url;

        variantSelect.innerHTML = '';

        product.variants.forEach((variant) => {
          const option = document.createElement('option');
          option.value = variant.id;
          option.textContent = variant.title;

          if (!variant.available) {
            option.disabled = true;
            option.textContent += ' - Sold out';
          }

          variantSelect.appendChild(option);
        });

        const availableVariant = product.variants.find(
          (variant) => variant.available
        );

        if (availableVariant) {
          variantSelect.value = availableVariant.id;
          addButton.disabled = false;
          addButton.textContent = 'ADD TO CART';
        } else {
          addButton.disabled = true;
          addButton.textContent = 'SOLD OUT';
        }

        message.textContent = '';

      } catch (error) {
        console.error(error);
        message.textContent = 'Unable to load product. Please try again.';
      }
    };

    section.querySelectorAll('[data-quick-view]').forEach((button) => {
      button.addEventListener('click', () => {
        loadProduct(button.dataset.productUrl);
      });
    });

    modal.querySelectorAll('[data-quick-view-close]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    addButton.addEventListener('click', async () => {
      if (!activeProduct || !variantSelect.value) return;

      addButton.disabled = true;
      addButton.textContent = 'ADDING...';
      message.textContent = '';

      try {
        const response = await fetch(
          `${window.Shopify?.routes?.root || '/'}cart/add.js`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              id: Number(variantSelect.value),
              quantity: 1
            })
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.description || 'Unable to add this product.');
        }

        addButton.textContent = 'ADDED TO CART';
        message.textContent = 'Product added to your cart.';

        document.dispatchEvent(
          new CustomEvent('cart:updated', { detail: result })
        );

      } catch (error) {
        message.textContent = error.message;
        addButton.textContent = 'ADD TO CART';
        addButton.disabled = false;
      }
    });
  });
});
