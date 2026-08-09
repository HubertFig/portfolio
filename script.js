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

// Contact form: sends to Formspree. Sign up at https://formspree.io,
// create a form, and replace YOUR_FORM_ID below with the ID it gives you.
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORM_ID";

const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

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
      status.textContent = "Thanks — your message has been sent.";
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
