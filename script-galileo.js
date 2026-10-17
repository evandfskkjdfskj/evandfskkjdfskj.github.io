(() => {
  const header = document.getElementById("siteHeader");
  const menuBtn = document.getElementById("menuBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuClose = document.getElementById("menuClose");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitLabel = document.getElementById("submitLabel");

  const lightSections = [
    document.getElementById("project"),
    document.getElementById("next"),
  ].filter(Boolean);

  function updateHeaderTheme() {
    const y = window.scrollY + 24;
    const onLight = lightSections.some((section) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + section.offsetHeight;
      // next-card is dark — treat only next-head as light via project+next until next-card
      return y >= top && y < bottom;
    });

    // If over the dark next-card or contact, force dark header
    const nextCard = document.querySelector(".next-card");
    const contact = document.getElementById("contact");
    const overDarkBlock =
      (nextCard &&
        y >= nextCard.getBoundingClientRect().top + window.scrollY) ||
      (contact && y >= contact.getBoundingClientRect().top + window.scrollY);

    header.classList.toggle("on-light", onLight && !overDarkBlock);
  }

  function openMenu() {
    menuOverlay.classList.add("open");
    menuOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    menuOverlay.classList.remove("open");
    menuOverlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
  }

  menuBtn?.addEventListener("click", openMenu);
  menuClose?.addEventListener("click", closeMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  menuOverlay?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", closeMenu)
  );

  window.addEventListener("scroll", updateHeaderTheme, { passive: true });
  window.addEventListener("resize", updateHeaderTheme);
  updateHeaderTheme();

  // Reveal on scroll
  const revealTargets = document.querySelectorAll(
    ".hero-frame, .hero-copy, .quote-sticky, .overview, .shot, .case-block, .next-head, .next-card, .profile-card, .contact-main"
  );
  revealTargets.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  revealTargets.forEach((el) => io.observe(el));

  // Count-up stats
  const stats = document.querySelectorAll(".stat-value[data-count]");
  const statsIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.count || 0);
        const suffix = el.dataset.suffix || "";
        const duration = 1200;
        const start = performance.now();

        function tick(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const value = Math.round(target * eased);
          el.textContent = `${value}${suffix}`;
          if (t < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        statsIo.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  stats.forEach((el) => statsIo.observe(el));

  // Form state
  function syncFormState() {
    if (!form || !submitBtn || !submitLabel) return;
    const valid = form.checkValidity();
    submitBtn.classList.toggle("is-ready", valid);
    submitLabel.textContent = valid ? "Send Message" : "Form Incomplete";
  }

  form?.addEventListener("input", syncFormState);
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      syncFormState();
      form.reportValidity();
      return;
    }
    submitLabel.textContent = "Message Sent";
    submitBtn.disabled = true;
    setTimeout(() => {
      form.reset();
      submitBtn.disabled = false;
      syncFormState();
    }, 1600);
  });
  syncFormState();

  // Smooth explore scroll already via CSS; ensure header offset feel
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
})();
