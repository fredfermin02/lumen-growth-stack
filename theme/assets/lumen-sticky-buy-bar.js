class LumenStickyBar extends HTMLElement {
  #threshold = 600;
  #onScroll = () => {
    const visible = window.scrollY >= this.#threshold;
    if (visible) {
      this.removeAttribute('hidden');
      this.setAttribute('data-visible', 'true');
    } else {
      this.removeAttribute('data-visible');
    }
  };
  #onDismiss = () => {
    this.remove();
    try {
      sessionStorage.setItem('lumen-sticky-dismissed', '1');
    } catch (_) {
      // sessionStorage may be unavailable (private mode, etc.) — fail silent
    }
  };

  connectedCallback() {
    try {
      if (sessionStorage.getItem('lumen-sticky-dismissed') === '1') {
        this.remove();
        return;
      }
    } catch (_) {
      // ignore
    }

    this.#threshold = parseInt(this.dataset.showAfter || '600', 10);
    window.addEventListener('scroll', this.#onScroll, { passive: true });

    const dismiss = this.querySelector('[data-lumen-sticky-dismiss]');
    if (dismiss) dismiss.addEventListener('click', this.#onDismiss);

    this.#onScroll();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.#onScroll);
  }
}

if (!customElements.get('lumen-sticky-bar')) {
  customElements.define('lumen-sticky-bar', LumenStickyBar);
}
