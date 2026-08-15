document.getElementById("year").textContent = new Date().getFullYear();

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ------------------------------------------------------------------
// Dark / light mode: defaults to sun position at the visitor's
// location (light while the sun is up, dark after sundown), computed
// via the browser's geolocation. The toggle overrides that with an
// explicit, remembered choice, which always wins over the sun.
// The actual attribute is set as early as possible by an inline
// script in <head>, before first paint, so there's no flash of the
// wrong theme -- this wires up the button, resolves the sun-based
// theme, and keeps localStorage in sync.
// ------------------------------------------------------------------
const root = document.documentElement;
const themeToggles = document.querySelectorAll(".theme-toggle");

function currentTheme() {
  return root.getAttribute("data-theme") === "light" ? "light" : "dark";
}

themeToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
});

// Sun-based auto theme -- only runs when the visitor hasn't made an
// explicit choice via the toggle. Uses the standard NOAA/SunCalc solar
// position formulas to find today's sunrise and sunset for the given
// coordinates, then sets light mode between them and dark otherwise.
// The result is cached so repeat visits paint the right theme
// instantly (see the inline <head> script) while this quietly
// refreshes it in the background.
function getSunTimes(lat, lon, date) {
  const rad = Math.PI / 180;
  const dayMs = 86400000;
  const J1970 = 2440588;
  const J2000 = 2451545;
  const e = rad * 23.4397;

  const toJulian = (d) => d.valueOf() / dayMs - 0.5 + J1970;
  const fromJulian = (j) => new Date((j + 0.5 - J1970) * dayMs);
  const toDays = (d) => toJulian(d) - J2000;
  const solarMeanAnomaly = (d) => rad * (357.5291 + 0.98560028 * d);
  const eclipticLongitude = (M) => {
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const P = rad * 102.9372;
    return M + C + P + Math.PI;
  };
  const declination = (l) => Math.asin(Math.sin(l) * Math.sin(e));
  const julianCycle = (d, lw) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const approxTransit = (Ht, lw, n) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
  const solarTransitJ = (ds, M, L) => J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const hourAngle = (h, phi, d) =>
    Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));

  const lw = rad * -lon;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  const h0 = -0.833 * rad;
  const Hset = hourAngle(h0, phi, dec);
  const Jset = solarTransitJ(approxTransit(Hset, lw, n), M, L);
  const Jrise = Jnoon - (Jset - Jnoon);

  return { sunrise: fromJulian(Jrise), sunset: fromJulian(Jset) };
}

if (!localStorage.getItem("theme") && navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (localStorage.getItem("theme")) return; // toggled while we were waiting
      const now = new Date();
      const { sunrise, sunset } = getSunTimes(position.coords.latitude, position.coords.longitude, now);
      if (Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) return;
      const theme = now >= sunrise && now < sunset ? "light" : "dark";
      localStorage.setItem("theme-auto", theme);
      root.setAttribute("data-theme", theme);
    },
    () => {}, // permission denied or unavailable -- keep the pre-paint default
    { timeout: 8000, maximumAge: 30 * 60 * 1000 }
  );
}

// ------------------------------------------------------------------
// Sticky nav: backdrop blur only once the page has actually scrolled
// ------------------------------------------------------------------
const header = document.querySelector(".site-header");
if (header) {
  const setScrolled = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });
}

// ------------------------------------------------------------------
// Active nav link: highlights whichever section is currently in view
// ------------------------------------------------------------------
const navLinks = document.querySelectorAll(".site-nav a[href^='#'], .site-nav a[href*='#']");
const sectionIds = ["work", "about", "contact"];
const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

if (sections.length && navLinks.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const match = link.getAttribute("href").endsWith(`#${entry.target.id}`);
          if (match) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => navObserver.observe(s));
}

// ------------------------------------------------------------------
// Mobile menu: full-screen overlay
// ------------------------------------------------------------------
const navToggle = document.getElementById("nav-toggle");
const mobileMenu = document.getElementById("mobile-menu");

function closeMenu() {
  if (!navToggle || !mobileMenu) return;
  navToggle.setAttribute("aria-expanded", "false");
  mobileMenu.classList.remove("is-open");
  document.body.classList.remove("menu-open");
}

if (navToggle && mobileMenu) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    mobileMenu.classList.toggle("is-open", !expanded);
    document.body.classList.toggle("menu-open", !expanded);
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      const hashIndex = href.indexOf("#");
      const isSamePageHash = hashIndex === 0;

      if (isSamePageHash) {
        // Same-page anchor: the browser's native scroll can no-op here,
        // since body is still overflow:hidden (menu-close transition)
        // at the moment the click's default action would fire. Close
        // first, then scroll manually once the body is scrollable again.
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        closeMenu();
        requestAnimationFrame(() => {
          if (target) {
            target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
          }
          history.pushState(null, "", href);
        });
      } else {
        closeMenu();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

// ------------------------------------------------------------------
// Expertise list: click to expand/collapse a short description
// ------------------------------------------------------------------
document.querySelectorAll(".expertise-trigger").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    const item = trigger.closest(".expertise-item");
    const isOpen = item.classList.contains("is-open");
    item.classList.toggle("is-open", !isOpen);
    trigger.setAttribute("aria-expanded", String(!isOpen));
  });
});

// ------------------------------------------------------------------
// Testimonials: clamp to 4 lines, expand on click/Enter/Space when
// truncated. Cards that don't overflow stay plain, non-interactive text.
// ------------------------------------------------------------------
document.querySelectorAll(".testimonial").forEach((card) => {
  const quote = card.querySelector(".testimonial-quote p");
  if (!quote) return;
  const isOverflowing = quote.scrollHeight > quote.clientHeight + 1;
  if (!isOverflowing) return;

  card.classList.add("has-overflow");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-expanded", "false");
  card.setAttribute("aria-label", `Expand full review from ${card.dataset.name}`);

  function toggle() {
    const expanded = card.getAttribute("aria-expanded") === "true";
    card.setAttribute("aria-expanded", String(!expanded));
  }

  card.addEventListener("click", toggle);
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
});

// ------------------------------------------------------------------
// Scroll reveal: fades/lifts/reveals [data-reveal] blocks (and process
// steps) into place as they enter the viewport, in scroll order. Skipped
// for prefers-reduced-motion, and progressively enhanced -- the
// .reveal-ready gate is only added here, so content stays visible if this
// script fails or IntersectionObserver isn't supported.
// ------------------------------------------------------------------
if (!prefersReducedMotion && "IntersectionObserver" in window) {
  document.body.classList.add("reveal-ready");

  const revealTargets = document.querySelectorAll(
    "[data-reveal], [data-reveal-scale], [data-reveal-line], .process-step"
  );

  revealTargets.forEach((el, i) => {
    if (el.hasAttribute("data-reveal-group")) return;
    el.style.setProperty("--i", i % 6);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));
}

// ------------------------------------------------------------------
// Custom cursor: desktop, hover-capable, fine-pointer devices only.
// Never attached on touch devices; never removes default focus styles;
// purely decorative and skipped entirely under reduced motion.
// ------------------------------------------------------------------
const supportsCustomCursor =
  !prefersReducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (supportsCustomCursor) {
  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  const ringLabel = document.createElement("span");
  ring.appendChild(ringLabel);
  document.body.append(dot, ring);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let active = false;

  window.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      if (!active) {
        active = true;
        document.documentElement.classList.add("cursor-active");
      }
    },
    { passive: true }
  );

  window.addEventListener("mouseleave", () => {
    document.documentElement.classList.remove("cursor-active");
    active = false;
  });

  function tick() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  const hoverTargets = document.querySelectorAll("[data-cursor-view]");
  hoverTargets.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      ring.classList.add("is-label");
      ringLabel.textContent = el.dataset.cursorView || "VIEW";
    });
    el.addEventListener("mouseleave", () => {
      ring.classList.remove("is-label");
      ringLabel.textContent = "";
    });
  });
}

// ------------------------------------------------------------------
// Contact form: opens the visitor's email client with the message
// pre-filled, addressed to CONTACT_EMAIL. No backend required, so it
// works the moment the page loads instead of depending on a third-party
// form service being configured.
// ------------------------------------------------------------------
const CONTACT_EMAIL = "info@hubertfigaroa.com";

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    const subject = `Portfolio message from ${name}`;
    const body = `${message}\n\n—\n${name}\n${email}`;
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    status.textContent = "Opening your email client…";
    status.className = "form-status";
    window.location.href = mailto;
  });
}
