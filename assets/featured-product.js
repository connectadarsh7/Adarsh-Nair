if (!customElements.get('featured-offer-cards')) {
  customElements.define(
    'featured-offer-cards',
    class FeaturedOfferCards extends HTMLElement {
      connectedCallback() {
        this.addEventListener('click', this.onCopyClick);
      }

      disconnectedCallback() {
        this.removeEventListener('click', this.onCopyClick);
      }

      onCopyClick = async (event) => {
        const button = event.target.closest('[data-copy-code]');
        if (!button || !this.contains(button)) return;

        try {
          await navigator.clipboard.writeText(button.dataset.copyCode);
          const status = button.querySelector('.featured-product__copy-status');
          if (status) status.textContent = 'Copied';
          button.setAttribute('aria-label', `Discount code ${button.dataset.copyCode} copied`);
          window.setTimeout(() => {
            if (!button.isConnected) return;
            if (status) status.textContent = '';
            button.setAttribute('aria-label', `Copy discount code ${button.dataset.copyCode}`);
          }, 1600);
        } catch (error) {
          console.error('Unable to copy the discount code.', error);
          button.setAttribute('aria-label', `Unable to copy discount code ${button.dataset.copyCode}`);
        }
      };
    }
  );
}
