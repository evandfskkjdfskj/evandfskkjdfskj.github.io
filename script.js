(() => {
  const header = document.getElementById("siteHeader");
  const menuBtn = document.getElementById("menuBtn");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitLabel = document.getElementById("submitLabel");
  const localTimeValue = document.getElementById("localTimeValue");

  /* ---------- Page enter / leave (Framer-like fade) ---------- */
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("page-anim");

  function markPageReady() {
    document.documentElement.classList.remove("is-page-leaving");
    document.documentElement.classList.add("is-page-ready");
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(markPageReady);
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) markPageReady();
  });

  function sameDocument(url) {
    return (
      url.origin === location.origin &&
      url.pathname === location.pathname &&
      url.search === location.search
    );
  }

  function isPageNavLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    if (anchor.target && anchor.target !== "_self") return false;
    if (anchor.hasAttribute("download")) return false;
    const raw = anchor.getAttribute("href");
    if (!raw || raw.startsWith("mailto:") || raw.startsWith("tel:")) return false;
    let url;
    try {
      url = new URL(anchor.href, location.href);
    } catch {
      return false;
    }
    if (url.origin !== location.origin) return false;
    if (sameDocument(url)) return false; // in-page hash / current page
    return true;
  }

  let isLeaving = false;
  function navigateWithFade(url) {
    if (isLeaving) return;
    if (reducedMotion) {
      location.href = url;
      return;
    }
    isLeaving = true;
    document.documentElement.classList.add("is-page-leaving");
    document.documentElement.classList.remove("is-page-ready");
    const go = () => {
      location.href = url;
    };
    window.setTimeout(go, 380);
  }

  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target.closest("a[href]");
      if (!isPageNavLink(anchor)) return;
      e.preventDefault();
      navigateWithFade(anchor.href);
    },
    true
  );

  /* ---------- Live local time ---------- */
  function updateLocalTime() {
    if (!localTimeValue) return;
    const now = new Date();
    localTimeValue.textContent = now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  updateLocalTime();
  setInterval(updateLocalTime, 1000);

  /* ---------- Background videos ---------- */
  document.querySelectorAll("video.hero-video, video.case-highlight-video, video.case-bg-video, video.shot-video-el").forEach((video) => {
    video.muted = true;
    video.playsInline = true;
    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    if (video.readyState >= 2) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });
    video.addEventListener("canplay", tryPlay, { once: true });
  });

  /* ---------- Header theme on scroll ---------- */
  const themedSections = [
    ...document.querySelectorAll("section[data-theme]"),
  ];

  function updateHeaderTheme() {
    if (!header) return;
    const y = 28;
    let theme = "light";
    for (const section of themedSections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= y && rect.bottom > y) {
        theme = section.dataset.theme || "light";
        break;
      }
    }
    // Case pages: next intro is light, but next-card / contact are dark
    const nextCard = document.querySelector(".next-card");
    if (nextCard) {
      const nr = nextCard.getBoundingClientRect();
      if (nr.top <= y && nr.bottom > y) theme = "dark";
    }
    header.classList.toggle("on-light", theme === "light");
  }

  window.addEventListener("scroll", updateHeaderTheme, { passive: true });
  window.addEventListener("resize", updateHeaderTheme);
  updateHeaderTheme();

  /* ---------- Case study background parallax ---------- */
  const caseCards = document.querySelectorAll(".case-card");
  function updateCaseParallax() {
    const vh = window.innerHeight || 1;
    caseCards.forEach((card) => {
      const img = card.querySelector(".case-bg-img");
      if (!img) return;
      const rect = card.getBoundingClientRect();
      // Skip far off-screen cards
      if (rect.bottom < -120 || rect.top > vh + 120) return;
      // Match Framer: as the card scrolls up, bg shifts down (~15% of scroll)
      // so the image lags behind the page and feels like it "drifts" extra.
      const y = -rect.top * 0.15;
      img.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
  }
  let parallaxRaf = 0;
  function requestParallax() {
    if (parallaxRaf) return;
    parallaxRaf = requestAnimationFrame(() => {
      parallaxRaf = 0;
      updateCaseParallax();
    });
  }
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax);
  updateCaseParallax();

  /* ---------- Menu ---------- */
  function openMenu() {
    menuOverlay?.classList.add("open");
    menuOverlay?.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-open");
    menuBtn?.setAttribute("aria-expanded", "true");
  }

  function closeMenu() {
    menuOverlay?.classList.remove("open");
    menuOverlay?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
    menuBtn?.setAttribute("aria-expanded", "false");
  }

  menuBtn?.addEventListener("click", () => {
    if (document.body.classList.contains("menu-open")) closeMenu();
    else openMenu();
  });

  menuBackdrop?.addEventListener("click", closeMenu);
  menuOverlay?.querySelectorAll(".menu-nav a, .menu-case").forEach((a) =>
    a.addEventListener("click", closeMenu)
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Accordions (services + FAQ) ---------- */
  document.querySelectorAll("[data-accordion]").forEach((root) => {
    const items = [...root.querySelectorAll(".acc-item")];
    items.forEach((item) => {
      const trigger = item.querySelector(".acc-trigger");
      trigger?.addEventListener("click", () => {
        const isOpen = item.classList.contains("open");
        items.forEach((other) => other.classList.remove("open"));
        if (!isOpen) item.classList.add("open");
      });
    });
  });

  /* ---------- Mission text scroll reveal ---------- */
  const mission = document.querySelector(".mission-text");
  if (mission) {
    const solid = mission.querySelector(".solid");
    const muted = mission.querySelector(".muted");
    if (solid && muted) {
      const syncMission = () => {
        const r = mission.getBoundingClientRect();
        const vh = window.innerHeight || 1;
        // Reveal muted copy as the block crosses mid-viewport
        const progress = Math.min(1, Math.max(0, (vh * 0.55 - r.top) / (r.height * 0.9)));
        muted.style.color = `rgba(18, 18, 18, ${0.32 + progress * 0.68})`;
      };
      syncMission();
      window.addEventListener("scroll", syncMission, { passive: true });
      window.addEventListener("resize", syncMission);
    }
  }

  /* ---------- Process cards ---------- */
  document.querySelectorAll(".process-card").forEach((card) => {
    card.classList.add("reveal");
  });

  /* ---------- Count-up ---------- */
  function animateCount(el) {
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    const decimals = Number(el.dataset.decimals || 0);
    const duration = 1400;
    const start = performance.now();

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      el.textContent =
        decimals > 0
          ? `${value.toFixed(decimals)}${suffix}`
          : `${Math.round(value)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
      else
        el.textContent =
          decimals > 0
            ? `${target.toFixed(decimals)}${suffix}`
            : `${target}${suffix}`;
    }

    requestAnimationFrame(tick);
  }

  const countEls = document.querySelectorAll(
    ".stat-value[data-count], .metric-value[data-count]"
  );
  const countIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countIo.unobserve(entry.target);
      });
    },
    { threshold: 0.4 }
  );
  countEls.forEach((el) => countIo.observe(el));

  /* ---------- Reveal animations ---------- */
  const revealTargets = document.querySelectorAll(
    [
      ".hero-bottom",
      ".hero-wordmark",
      ".sticky-card",
      ".mission-text",
      ".stat-card",
      ".portfolio-head",
      ".case-card",
      ".services-top",
      ".acc-item",
      ".process-head",
      ".process-card",
      ".ready-card",
      ".testimonials-intro",
      ".t-card",
      ".metrics-grid article",
      ".case-highlight blockquote",
      ".case-highlight-stats > div",
      ".price-card",
      ".clarity-banner",
      ".faq-intro",
      ".blog-card",
      ".profile-card",
      ".contact-main",
    ].join(", ")
  );

  revealTargets.forEach((el) => el.classList.add("reveal"));

  const revealIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in");
        revealIo.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );
  revealTargets.forEach((el) => revealIo.observe(el));

  /* ---------- Form validation ---------- */
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

  /* ---------- Smooth in-page anchors ---------- */
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

  document.querySelectorAll("video[data-lazy-video]").forEach((video) => {
    if (reducedMotion) return;
    const start = () => {
      video.preload = "auto";
      const play = video.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
    };
    if (!("IntersectionObserver" in window)) {
      start();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          start();
          observer.disconnect();
        });
      },
      { rootMargin: "240px" }
    );
    observer.observe(video);
  });

  /* ---------- Portfolio / blog filters ---------- */
  const filterBar = document.querySelector(".filter-bar");
  if (filterBar) {
    const buttons = [...filterBar.querySelectorAll("[data-filter]")];
    const items = [
      ...document.querySelectorAll(".case-card[data-tags], .blog-card[data-tags]"),
    ];
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter || "all";
        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
        items.forEach((item) => {
          const tags = (item.dataset.tags || "").toLowerCase();
          const show = filter === "all" || tags.includes(filter);
          item.hidden = !show;
        });
      });
    });
  }
})();
