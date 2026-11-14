const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

const promptGrid = document.getElementById("promptGrid");
const searchInput = document.getElementById("searchInput");

let prompts = [];

/* STOP TEXT FROM BEING TREATED AS HTML */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* LOAD PROMPTS */
async function loadPrompts(silent = false) {
  try {
    if (!silent) {
      promptGrid.innerHTML = "<p>Loading prompts...</p>";
    }

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Server error (" + response.status + ")");
    }

    const fresh = await response.json();

    if (!Array.isArray(fresh)) {
      throw new Error("Unexpected response from server");
    }

    // Background refresh: only redraw if something was added or deleted
    const oldIds = prompts.map(p => p._id).join(",");
    const newIds = fresh.map(p => p._id).join(",");

    prompts = fresh;

    if (!silent || oldIds !== newIds) {
      applySearch();
    }

  } catch (error) {
    console.log("Error loading prompts", error);

    // A failed background refresh should not wipe prompts already on screen
    if (!silent) {
      promptGrid.innerHTML = `
        <h2>Failed to load prompts</h2>
      `;
    }
  }
}

/* DISPLAY PROMPTS */
function displayPrompts(data) {
  promptGrid.innerHTML = "";

  if (!data || data.length === 0) {
    promptGrid.innerHTML = "<p>No prompts found</p>";
    return;
  }

  data.forEach(prompt => {
    const card = document.createElement("div");
    card.className = "prompt-card";

    const text = prompt.promptText || prompt.prompt || "";

    card.innerHTML = `
      <img src="${escapeHtml(prompt.image)}" alt="${escapeHtml(prompt.title)}" loading="lazy">

      <div class="card-content">

        <span class="category">
          ${escapeHtml(prompt.category)}
        </span>

        <h2>
          ${escapeHtml(prompt.title)}
        </h2>

        <p>
          ${escapeHtml(text)}
        </p>

        <button class="copy-btn">
          Copy Prompt
        </button>

      </div>
    `;

    card.querySelector(".copy-btn").addEventListener("click", () => {
      copyPrompt(text);
    });

    promptGrid.appendChild(card);
  });
}

/* COPY PROMPT */
function copyPrompt(text) {
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => alert("Prompt Copied 🚀"))
    .catch(() => alert("Copy failed"));
}

/* SEARCH */
function applySearch() {
  const value = searchInput ? searchInput.value.toLowerCase() : "";

  const filtered = prompts.filter(prompt =>
    (prompt.title || "").toLowerCase().includes(value) ||
    (prompt.category || "").toLowerCase().includes(value)
  );

  displayPrompts(filtered);
}

if (searchInput) {
  searchInput.addEventListener("input", applySearch);
}

/* START */
loadPrompts();

/* AUTO-UPDATE: check for new prompts every minute and when the tab is opened again */
setInterval(() => {
  if (!document.hidden) {
    loadPrompts(true);
  }
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    loadPrompts(true);
  }
});
