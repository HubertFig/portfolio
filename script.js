document.getElementById("year").textContent = new Date().getFullYear();

// Dark mode toggle: overrides system preference and persists the choice.
const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");

function currentTheme() {
  return root.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

themeToggle.addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// Mobile nav: collapsible menu below ~640px, where the full link row no longer fits.
const navToggle = document.getElementById("nav-toggle");
const siteNav = document.getElementById("site-nav");

function closeNav() {
  navToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("open");
}

navToggle.addEventListener("click", () => {
  const expanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!expanded));
  siteNav.classList.toggle("open");
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeNav);
});

// Testimonials: clamp to 2 lines, expand on click/Enter/Space when truncated.
// Cards that don't actually overflow stay plain, non-interactive text --
// otherwise they'd be a focusable "button" that does nothing when activated.
document.querySelectorAll(".testimonial").forEach((card) => {
  const quote = card.querySelector(".testimonial-quote p");
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

// Scroll reveal: fades/lifts [data-reveal] blocks into place as they enter
// the viewport, in the order they're actually encountered while scrolling.
// Skipped entirely for prefers-reduced-motion, and progressively enhanced --
// the .reveal-ready gate is only added here, so content stays fully visible
// by default if this script fails or IntersectionObserver isn't supported.
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  document.body.classList.add("reveal-ready");

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => {
    revealObserver.observe(el);
  });
}

// Contact form: opens the visitor's email client with the message
// pre-filled, addressed to CONTACT_EMAIL. No backend required, so it
// works the moment the page loads instead of depending on a third-party
// form service being configured.
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
    const body = `${message}\n\n\u2014\n${name}\n${email}`;
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    status.textContent = "Opening your email client\u2026";
    status.className = "form-status";
    window.location.href = mailto;
  });
}
