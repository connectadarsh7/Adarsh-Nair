
/* ==============================
   LOOMHAUS HEADER JAVASCRIPT
================================= */

document.addEventListener('DOMContentLoaded', () => {
  const cartCountElements = document.querySelectorAll('[data-cart-count]');
  const cartLinks = document.querySelectorAll('.loomhaus-header__cart');

  /**
   * Fetch the latest cart information
   * and update the cart count without reloading.
   */
  async function updateCartCount() {
    try {
      const response = await fetch(
        `${window.Shopify.routes.root}cart.js`
      );

      if (!response.ok) {
        throw new Error('Unable to fetch cart information');
      }

      const cart = await response.json();

      cartCountElements.forEach((element) => {
        element.textContent = cart.item_count;
      });

      cartLinks.forEach((link) => {
        link.setAttribute(
          'aria-label',
          `Shopping cart, ${cart.item_count} items`
        );
      });
    } catch (error) {
      console.error('Loomhaus cart update error:', error);
    }
  }

  // Get the latest cart count when the page loads.
  updateCartCount();

  // Allow other custom scripts to request a cart count refresh.
  document.addEventListener('cart:updated', updateCartCount);

  // Refresh when a visitor returns to the page.
  window.addEventListener('pageshow', updateCartCount);
});
