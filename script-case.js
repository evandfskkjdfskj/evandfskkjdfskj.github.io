/* Case-page extras only — header/menu/time live in script.js */
(() => {
  // Do NOT add .reveal / transform to case content.
  // transform on .quote-sticky (or ancestors) breaks position:sticky, so the
  // left copy scrolls away and "vanishes". Opacity reveals also hide
  // .case-block headings until IO fires, which looked like missing text.

  function animateCount(el) {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = `${target}${suffix}`;
    }
    requestAnimationFrame(tick);
  }

  const stats = document.querySelectorAll(".stat-value[data-count]");
  const statsIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        statsIo.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  stats.forEach((el) => statsIo.observe(el));

  /* Jim outfit color switcher (P3) — horizontal slide */
  document.querySelectorAll("[data-jim-outfit]").forEach((root) => {
    const order = swatchesOrder(root);
    const chars = [...root.querySelectorAll(".jim-outfit-char")];
    const swatches = [...root.querySelectorAll(".jim-swatch")];
    let current = swatches.find((b) => b.classList.contains("is-active"))?.dataset.outfit || order[0];
    let busy = false;

    const charByKey = (key) => chars.find((img) => img.dataset.outfit === key);

    const setOutfit = (key) => {
      if (!key || key === current || busy) return;
      const from = order.indexOf(current);
      const to = order.indexOf(key);
      if (from < 0 || to < 0) return;
      const dir = to > from ? 1 : -1;
      const outgoing = charByKey(current);
      const incoming = charByKey(key);
      if (!outgoing || !incoming) return;

      busy = true;
      outgoing.classList.remove("is-active", "is-slide-in-left", "is-slide-in-right");
      outgoing.classList.add(dir > 0 ? "is-slide-out-left" : "is-slide-out-right");

      incoming.classList.remove("is-slide-out-left", "is-slide-out-right", "is-active");
      incoming.classList.add(dir > 0 ? "is-slide-in-right" : "is-slide-in-left");
      void incoming.offsetWidth;
      incoming.classList.remove("is-slide-in-left", "is-slide-in-right");
      incoming.classList.add("is-active");

      swatches.forEach((btn) => {
        const on = btn.dataset.outfit === key;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-selected", on ? "true" : "false");
      });
      current = key;

      window.setTimeout(() => {
        outgoing.classList.remove("is-slide-out-left", "is-slide-out-right");
        busy = false;
      }, 500);
    };

    swatches.forEach((btn) => {
      btn.addEventListener("click", () => setOutfit(btn.dataset.outfit));
    });
  });

  function swatchesOrder(root) {
    return [...root.querySelectorAll(".jim-swatch")].map((b) => b.dataset.outfit);
  }
})();
