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

// Contact form: sends to Formspree. Sign up at https://formspree.io,
// create a form, and replace YOUR_FORM_ID below with the ID it gives you.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    status.textContent = "Sending...";
    status.className = "form-status";

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (response.ok) {
        status.textContent = "Thanks \u2014 your message has been sent.";
        status.className = "form-status success";
        form.reset();
      } else {
        throw new Error("Request failed");
      }
    } catch (err) {
      status.textContent = "Something went wrong. Please email me directly instead.";
      status.className = "form-status error";
    } finally {
      button.disabled = false;
    }
  });
}
