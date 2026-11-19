/*
 * Promptify public frontend
 * Replacement for: frontend/script.js
 *
 * Public prompt cards show only:
 *   1. Image
 *   2. Clickable AI-tool label (for supported categories)
 *   3. Copy Prompt button
 *
 * The complete prompt remains in the API response and is copied on demand.
 */

const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

const AI_TOOLS = {
  chatgpt: {
    name: "ChatGPT",
    url: "https://chatgpt.com/"
  },
  gemini: {
    name: "Gemini",
    url: "https://gemini.google.com/"
  },
  leonardoai: {
    name: "Leonardo AI",
    url: "https://leonardo.ai/"
  },
  midjourney: {
    name: "Midjourney",
    url: "https://www.midjourney.com/"
  }
};

const promptGrid = document.getElementById("promptGrid");
const trendingSection = document.getElementById("trending");
const trendingRow = document.getElementById("trendingRow");
const searchInput = document.getElementById("searchInput");

let prompts = [];
let refreshTimer = null;

function normalizeCategory(category) {
  return String(category ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getTool(category) {
  const key = normalizeCategory(category);
  return Object.prototype.hasOwnProperty.call(AI_TOOLS, key)
    ? AI_TOOLS[key]
    : null;
}

function getPromptText(prompt) {
  const value = prompt && (prompt.promptText || prompt.prompt);
  return typeof value === "string" ? value : "";
}

function getSafeImageUrl(value) {
  if (typeof value !== "string") return "";

  const source = value.trim();
  if (!source) return "";

  // Promptify stores images as base64 data URLs or normal hosted image URLs.
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source)) {
    return source;
  }

  try {
    const parsed = new URL(source, window.location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.href;
    }
  } catch (error) {
    // Invalid image URL: leave the image source empty.
  }

  return "";
}

function createPromptCard(prompt) {
  const card = document.createElement("article");
  card.className = "prompt-card";

  const media = document.createElement("div");
  media.className = "card-media";

  const image = document.createElement("img");
  image.src = getSafeImageUrl(prompt.image);
  image.alt = typeof prompt.title === "string" && prompt.title.trim()
    ? prompt.title.trim()
    : "AI prompt image";
  image.loading = "lazy";
  image.decoding = "async";

  media.appendChild(image);

  const tool = getTool(prompt.category);
  if (tool) {
    const toolLink = document.createElement("a");
    toolLink.className = "tool-label";
    toolLink.href = tool.url;
    toolLink.target = "_blank";
    toolLink.rel = "noopener noreferrer";
    toolLink.textContent = `${tool.name} ↗`;
    toolLink.setAttribute("aria-label", `Open ${tool.name} in a new tab`);
    // No click handler is attached to this anchor; normal browser navigation works.
    media.appendChild(toolLink);
  } else if (prompt.category) {
    // Keep an unknown category visible, but never send it to a guessed destination.
    const categoryLabel = document.createElement("span");
    categoryLabel.className = "tool-label";
    categoryLabel.textContent = String(prompt.category);
    media.appendChild(categoryLabel);
  }

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-btn";
  copyButton.textContent = "Copy Prompt";
  copyButton.dataset.id = String(prompt._id ?? "");
  copyButton.setAttribute("aria-label", "Copy the complete prompt");

  // Intentionally no title or description is added to the public card.
  card.appendChild(media);
  card.appendChild(copyButton);

  return card;
}

function renderCardList(container, items, emptyMessage) {
  if (!container) return;

  container.replaceChildren();

  if (!items.length) {
    const message = document.createElement("p");
    message.className = "message";
    message.textContent = emptyMessage;
    container.appendChild(message);
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach(prompt => fragment.appendChild(createPromptCard(prompt)));
  container.appendChild(fragment);
}

function render() {
  if (!promptGrid) return;

  const searchTerm = searchInput
    ? searchInput.value.trim().toLowerCase()
    : "";

  // Show trending in the order saved by the admin dashboard.
  const trending = prompts
    .filter(prompt => prompt.isTrending === true)
    .slice()
    .sort((a, b) => {
      const orderA = Number.isFinite(Number(a.trendingOrder))
        ? Number(a.trendingOrder)
        : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(Number(b.trendingOrder))
        ? Number(b.trendingOrder)
        : Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

  if (trendingSection && trendingRow) {
    if (trending.length > 0 && !searchTerm) {
      trendingSection.hidden = false;
      renderCardList(trendingRow, trending, "No trending prompts yet");
    } else {
      trendingSection.hidden = true;
      trendingRow.replaceChildren();
    }
  }

  const filtered = prompts.filter(prompt => {
    if (!searchTerm) return true;

    return [
      prompt.title,
      prompt.category,
      getPromptText(prompt)
    ].some(value => String(value ?? "").toLowerCase().includes(searchTerm));
  });

  renderCardList(promptGrid, filtered, "No prompts found");
}

async function loadPrompts(showLoading = false) {
  if (!promptGrid) return;

  try {
    if (showLoading) {
      const loading = document.createElement("p");
      loading.className = "message";
      loading.textContent = "Loading prompts...";
      promptGrid.replaceChildren(loading);
    }

    const response = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Server error (${response.status})`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response from the Promptify API");
    }

    // Detect prompt edits as well as additions, removals and Trending changes.
    const signature = list => JSON.stringify(list.map(prompt => ({
      id: prompt._id,
      image: prompt.image,
      title: prompt.title,
      category: prompt.category,
      promptText: getPromptText(prompt),
      isTrending: prompt.isTrending,
      trendingOrder: prompt.trendingOrder
    })));

    const changed = signature(prompts) !== signature(data);
    prompts = data;

    if (showLoading || changed || prompts.length === 0) {
      render();
    } else if (promptGrid.childElementCount === 0) {
      render();
    }
  } catch (error) {
    console.error("Promptify: failed to load prompts", error);

    if (showLoading || prompts.length === 0) {
      const message = document.createElement("p");
      message.className = "message";
      message.textContent = "Unable to load prompts. Please refresh the page.";
      promptGrid.replaceChildren(message);
    }
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  textarea.remove();
  return copied;
}

async function copyText(text) {
  if (!text) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      return fallbackCopy(text);
    }
  }

  return fallbackCopy(text);
}

// One delegated handler supports cards loaded now and cards loaded later.
// It listens only to Copy Prompt buttons, never to AI-tool anchors.
document.addEventListener("click", async event => {
  const button = event.target.closest(".copy-btn");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();

  const prompt = prompts.find(item => String(item._id) === button.dataset.id);
  const fullPromptText = prompt ? getPromptText(prompt) : "";

  if (!fullPromptText) {
    button.textContent = "Prompt unavailable";
    window.setTimeout(() => { button.textContent = "Copy Prompt"; }, 1500);
    return;
  }

  const copied = await copyText(fullPromptText);
  button.textContent = copied ? "Copied!" : "Copy failed";
  window.setTimeout(() => {
    if (button.isConnected) button.textContent = "Copy Prompt";
  }, 1500);
});

if (searchInput) {
  searchInput.addEventListener("input", render);
}

// Initial page load, then refresh while the visitor has the page open.
loadPrompts(true);

refreshTimer = window.setInterval(() => {
  if (!document.hidden) loadPrompts(false);
}, 60000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) loadPrompts(false);
});
