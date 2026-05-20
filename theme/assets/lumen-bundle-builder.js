class LumenBundleBuilder extends HTMLElement {
  #target = 12;
  #discountCode = '';
  #counts = new Map();
  #cards = [];
  #submitBtn = null;
  #countEl = null;
  #barEl = null;
  #statusEl = null;

  connectedCallback() {
    this.#target = parseInt(this.dataset.bundleSize || '12', 10);
    this.#discountCode = this.dataset.discountCode || '';
    this.#cards = Array.from(this.querySelectorAll('[data-variant-id]'));
    this.#submitBtn = this.querySelector('[data-bundle-submit]');
    this.#countEl = this.querySelector('[data-bundle-count]');
    this.#barEl = this.querySelector('[data-bundle-bar]');
    this.#statusEl = this.querySelector('[data-bundle-status]');

    for (const card of this.#cards) {
      const variantId = card.dataset.variantId;
      this.#counts.set(variantId, 0);
      card.querySelector('[data-bundle-increment]')?.addEventListener('click', () => this.#change(variantId, 1));
      card.querySelector('[data-bundle-decrement]')?.addEventListener('click', () => this.#change(variantId, -1));
    }

    this.#submitBtn?.addEventListener('click', () => this.#submit());
    this.#render();
  }

  #total() {
    let sum = 0;
    for (const v of this.#counts.values()) sum += v;
    return sum;
  }

  #change(variantId, delta) {
    const cur = this.#counts.get(variantId) ?? 0;
    const next = Math.max(0, cur + delta);
    const total = this.#total() - cur + next;
    if (total > this.#target) return;
    this.#counts.set(variantId, next);
    this.#render();
  }

  #render() {
    const total = this.#total();

    if (this.#countEl) this.#countEl.textContent = String(total);
    if (this.#barEl) this.#barEl.style.width = `${(total / this.#target) * 100}%`;

    for (const card of this.#cards) {
      const variantId = card.dataset.variantId;
      const qty = this.#counts.get(variantId) ?? 0;
      const qtyEl = card.querySelector('[data-bundle-qty]');
      if (qtyEl) qtyEl.textContent = String(qty);
      card.dataset.bundleActive = qty > 0 ? 'true' : 'false';

      const inc = card.querySelector('[data-bundle-increment]');
      const dec = card.querySelector('[data-bundle-decrement]');
      if (inc) inc.disabled = total >= this.#target;
      if (dec) dec.disabled = qty === 0;
    }

    if (this.#submitBtn) {
      this.#submitBtn.disabled = total !== this.#target;
      this.#submitBtn.textContent = total === this.#target
        ? `Add ${this.#target} to cart`
        : `Pick ${this.#target - total} more`;
    }

    if (this.#statusEl && this.#statusEl.dataset.status !== 'success') {
      this.#statusEl.textContent = '';
      delete this.#statusEl.dataset.status;
    }
  }

  async #submit() {
    if (this.#total() !== this.#target) return;
    if (!this.#submitBtn) return;

    const items = [];
    for (const [variantId, qty] of this.#counts.entries()) {
      if (qty > 0) items.push({ id: parseInt(variantId, 10), quantity: qty });
    }
    if (!items.length) return;

    this.#submitBtn.disabled = true;
    this.#submitBtn.textContent = 'Adding…';
    this.#setStatus('', null);

    try {
      const res = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/javascript' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.description || `Add to cart failed (${res.status})`);
      }
      document.dispatchEvent(new CustomEvent('cart:update', {
        bubbles: true,
        detail: { source: 'lumen-bundle-builder', itemCount: items.length },
      }));
      this.#setStatus('Bundle added — redirecting…', 'success');
      const next = this.#discountCode
        ? `/discount/${encodeURIComponent(this.#discountCode)}?redirect=/cart`
        : '/cart';
      window.location.href = next;
    } catch (err) {
      this.#setStatus(err.message || 'Something went wrong. Please try again.', 'error');
      this.#submitBtn.disabled = false;
      this.#submitBtn.textContent = `Add ${this.#target} to cart`;
    }
  }

  #setStatus(message, kind) {
    if (!this.#statusEl) return;
    this.#statusEl.textContent = message;
    if (kind) this.#statusEl.dataset.status = kind;
    else delete this.#statusEl.dataset.status;
  }
}

if (!customElements.get('lumen-bundle-builder')) {
  customElements.define('lumen-bundle-builder', LumenBundleBuilder);
}
