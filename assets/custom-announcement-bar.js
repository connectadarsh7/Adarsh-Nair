/* Loomhaus mobile announcement rotation */

(function () {
  function initAnnouncementBars(root = document) {
    const sections = root.querySelectorAll(
      '[data-announcement-section]'
    );

    sections.forEach((section) => {
      const mobileContainer = section.querySelector(
        '.loomhaus-announcement__mobile'
      );

      if (!mobileContainer) return;

      const slides = mobileContainer.querySelectorAll(
        '[data-announcement-slide]'
      );

      if (slides.length <= 1) return;

      // Prevent duplicate intervals in Shopify theme editor
      if (section.announcementInterval) {
        clearInterval(section.announcementInterval);
      }

      let currentIndex = 0;

      section.announcementInterval = setInterval(() => {
        slides[currentIndex].classList.remove('is-active');
        slides[currentIndex].setAttribute('aria-hidden', 'true');

        currentIndex = (currentIndex + 1) % slides.length;

        slides[currentIndex].classList.add('is-active');
        slides[currentIndex].setAttribute('aria-hidden', 'false');
      }, 3000);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initAnnouncementBars();
  });

  document.addEventListener('shopify:section:load', (event) => {
    initAnnouncementBars(event.target);
  });
})();