/* Promptify public frontend
 * Shared by trending.html and all-prompts.html.
 * Trending and All Prompts are now separate pages.
 */

const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

const AI_TOOLS = {
  chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" },
  gemini: { name: "Gemini", url: "https://gemini.google.com/" },
  leonardoai: { name: "Leonardo AI", url: "https://leonardo.ai/" },
  midjourney: { name: "Midjourney", url: "https://www.midjourney.com/" }
};

const promptGrid = document.getElementById("promptGrid");
const trendingGrid = document.getElementById("trendingGrid");
const searchInput = document.getElementById("searchInput");
const pageType = trendingGrid ? "trending" : promptGrid ? "all" : "none";

let prompts = [];

function normalizeCategory(category) {
  return String(category ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getTool(category) {
  const key = normalizeCategory(category);
  return Object.prototype.hasOwnProperty.call(AI_TOOLS, key) ? AI_TOOLS[key] : null;
}

function getPromptText(prompt) {
  const value = prompt && (prompt.promptText || prompt.prompt);
  return typeof value === "string" ? value : "";
}

function getSafeImageUrl(value) {
  if (typeof value !== "string") return "";
  const source = value.trim();
  if (!source) return "";

  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source)) return source;

  try {
    const parsed = new URL(source, window.location.href);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.href;
  } catch (error) {
    console.warn("Promptify: invalid image URL", error);
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
  image.alt = "AI prompt preview";
  image.loading = "lazy";
  image.decoding = "async";
  media.appendChild(image);

  const tool = getTool(prompt.category);
  if (tool) {
    const link = document.createElement("a");
    link.className = "tool-label";
    link.href = tool.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `${tool.name} ↗`;
    link.setAttribute("aria-label", `Open ${tool.name} in a new tab`);
    media.appendChild(link);
  } else if (prompt.category) {
    const label = document.createElement("span");
    label.className = "tool-label";
    label.textContent = String(prompt.category);
    media.appendChild(label);
  }

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-btn";
  copyButton.textContent = "Copy Prompt";
  copyButton.dataset.id = String(prompt._id ?? "");
  copyButton.setAttribute("aria-label", "Copy the complete prompt");

  // Public card intentionally contains no title or prompt description.
  card.append(media, copyButton);
  return card;
}

function getTrendingPrompts(list) {
  return list
    .filter(prompt => prompt.isTrending === true)
    .slice()
    .sort((a, b) => {
      const aOrder = Number.isFinite(Number(a.trendingOrder)) ? Number(a.trendingOrder) : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(Number(b.trendingOrder)) ? Number(b.trendingOrder) : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });
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
  if (pageType === "none") return;

  const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const source = pageType === "trending" ? getTrendingPrompts(prompts) : prompts;
  const filtered = source.filter(prompt => {
    if (!term) return true;
    return [prompt.title, prompt.category, getPromptText(prompt)]
      .some(value => String(value ?? "").toLowerCase().includes(term));
  });

  if (pageType === "trending") {
    renderCardList(trendingGrid, filtered, "No trending prompts yet. Check back soon.");
  } else {
    renderCardList(promptGrid, filtered, "No prompts found.");
  }
}

async function loadPrompts(showLoading = false) {
  if (pageType === "none") return;
  const activeGrid = pageType === "trending" ? trendingGrid : promptGrid;

  try {
    if (showLoading && activeGrid) {
      const loading = document.createElement("p");
      loading.className = "message";
      loading.textContent = "Loading prompts...";
      activeGrid.replaceChildren(loading);
    }

    const response = await fetch(API_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Server error (${response.status})`);

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected response from the Promptify API");

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
    if (showLoading || changed || activeGrid.childElementCount === 0) render();
  } catch (error) {
    console.error("Promptify: failed to load prompts", error);
    if (showLoading || prompts.length === 0) {
      const message = document.createElement("p");
      message.className = "message";
      message.textContent = "Unable to load prompts. Please refresh the page.";
      if (activeGrid) activeGrid.replaceChildren(message);
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
  try { copied = document.execCommand("copy"); } catch (error) { copied = false; }
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

document.addEventListener("click", async event => {
  const button = event.target.closest(".copy-btn");
  if (!button) return;

  event.preventDefault();
  event.stopPropagation();
  const prompt = prompts.find(item => String(item._id) === button.dataset.id);
  const text = prompt ? getPromptText(prompt) : "";

  if (!text) {
    button.textContent = "Prompt unavailable";
    window.setTimeout(() => { if (button.isConnected) button.textContent = "Copy Prompt"; }, 1500);
    return;
  }

  const copied = await copyText(text);
  button.textContent = copied ? "Copied!" : "Copy failed";
  window.setTimeout(() => { if (button.isConnected) button.textContent = "Copy Prompt"; }, 1500);
});

if (searchInput) searchInput.addEventListener("input", render);

if (pageType !== "none") {
  loadPrompts(true);
  window.setInterval(() => {
    if (!document.hidden) loadPrompts(false);
  }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadPrompts(false);
  });
}
