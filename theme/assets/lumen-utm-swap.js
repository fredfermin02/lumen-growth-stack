(() => {
  const params = new URLSearchParams(window.location.search);
  const audience = params.get('audience');
  if (!audience) return;

  const scripts = document.querySelectorAll('script[data-lumen-utm-swap]');
  if (!scripts.length) return;

  for (const script of scripts) {
    const sectionId = script.getAttribute('data-lumen-utm-swap');
    let swapMap;
    try {
      swapMap = JSON.parse(script.textContent || '{}');
    } catch (_) {
      continue;
    }

    const variant = swapMap[audience];
    if (!variant) continue;

    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!section) continue;

    if (variant.headline) {
      const target = section.querySelector('[data-utm-headline]');
      if (target) target.textContent = variant.headline;
    }

    if (variant.image) {
      const img = section.querySelector('img[data-utm-image]');
      if (img) {
        img.removeAttribute('srcset');
        img.removeAttribute('sizes');
        img.src = variant.image;
      } else {
        const container = section.querySelector('[data-utm-image-container]');
        if (container) {
          container.innerHTML = `<img src="${variant.image}" class="${section.querySelector('.lumen-hero-split__image, .lumen-hero-fullbleed__image')?.className || ''}" alt="" data-utm-image />`;
        }
      }
    }
  }
})();
