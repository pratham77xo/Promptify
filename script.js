const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

/* Official sites. Keys are normalised (lower-case, letters/digits only) so
   "ChatGPT", "chatgpt ", "Chat GPT" and "Leonardo AI" / "leonardo-ai" all match,
   but unsupported categories never get a link. */
const TOOLS = {
  chatgpt:    { name: "ChatGPT",     url: "https://chatgpt.com/" },
  gemini:     { name: "Gemini",      url: "https://gemini.google.com/" },
  leonardoai: { name: "Leonardo AI", url: "https://leonardo.ai/" },
  midjourney: { name: "Midjourney",  url: "https://www.midjourney.com/" }
};

function findTool(category) {
  const key = String(category ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.prototype.hasOwnProperty.call(TOOLS, key) ? TOOLS[key] : null;
}

const promptGrid = document.getElementById("promptGrid");
const trendingSection = document.getElementById("trending");
const trendingRow = document.getElementById("trendingRow");
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

/* The full original prompt text (never shortened) */
function getPromptText(prompt) {
  return prompt.promptText || prompt.prompt || "";
}

/* LOAD PROMPTS */
async function loadPrompts(silent = false) {
  try {
    if (!silent) {
      promptGrid.innerHTML = '<p class="message">Loading prompts...</p>';
    }

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Server error (" + response.status + ")");
    }

    const fresh = await response.json();

    if (!Array.isArray(fresh)) {
      throw new Error("Unexpected response from server");
    }

    // Background refresh: redraw only if prompts or trending order changed
    const signature = list =>
      list.map(p => p._id + ":" + (p.isTrending ? p.trendingOrder : "-")).join(",");

    const changed = signature(prompts) !== signature(fresh);

    prompts = fresh;

    if (!silent || changed) {
      render();
    }

  } catch (error) {
    console.log("Error loading prompts", error);

    // A failed background refresh should not wipe prompts already on screen
    if (!silent) {
      promptGrid.innerHTML = '<p class="message">Failed to load prompts. Please refresh the page.</p>';
    }
  }
}

/* ONE IMAGE CARD: image + tool label + copy button */
function cardHtml(prompt) {
  const tool = findTool(prompt.category);
  const category = prompt.category || "";

  const label = tool
    ? `<a class="tool-label" href="${tool.url}" target="_blank" rel="noopener noreferrer" aria-label="Open ${tool.name} in a new tab">${tool.name} <span aria-hidden="true">&#8599;</span></a>`
    : `<span class="tool-label">${escapeHtml(category)}</span>`;

  return `
    <article class="prompt-card">
      <div class="card-media">
        <img src="${escapeHtml(prompt.image)}" alt="${escapeHtml(prompt.title)}" loading="lazy" decoding="async">
        ${label}
      </div>
      <button type="button" class="copy-btn" data-id="${escapeHtml(prompt._id)}">Copy Prompt</button>
    </article>`;
}

/* DRAW EVERYTHING */
function render() {
  const value = searchInput ? searchInput.value.trim().toLowerCase() : "";

  /* Trending: in the exact order saved in the admin dashboard */
  const trending = prompts
    .filter(p => p.isTrending)
    .sort((a, b) => (a.trendingOrder ?? 0) - (b.trendingOrder ?? 0));

  if (trending.length && !value) {
    trendingRow.innerHTML = trending.map(cardHtml).join("");
    trendingSection.hidden = false;
  } else {
    trendingRow.innerHTML = "";
    trendingSection.hidden = true;
  }

  /* All prompts (search still matches title, category and prompt text) */
  const filtered = prompts.filter(p =>
    (p.title || "").toLowerCase().includes(value) ||
    (p.category || "").toLowerCase().includes(value) ||
    getPromptText(p).toLowerCase().includes(value)
  );

  promptGrid.innerHTML = filtered.length
    ? filtered.map(cardHtml).join("")
    : '<p class="message">No prompts found</p>';
}

/* COPY PROMPT (one listener for every card; tool label links are not buttons, so they never copy) */
document.addEventListener("click", event => {
  const button = event.target.closest(".copy-btn");

  if (!button) return;

  const prompt = prompts.find(p => p._id === button.dataset.id);
  const text = prompt ? getPromptText(prompt) : "";

  if (!text) return;

  copyText(text).then(ok => {
    button.textContent = ok ? "Copied!" : "Copy failed";
    setTimeout(() => { button.textContent = "Copy Prompt"; }, 1500);
  });
});

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true, () => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  let ok = false;
  try { ok = document.execCommand("copy"); } catch (e) { ok = false; }

  area.remove();
  return ok;
}

/* SEARCH */
if (searchInput) {
  searchInput.addEventListener("input", render);
}

/* START */
loadPrompts();

/* AUTO-UPDATE: check every minute and when the tab is opened again */
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
