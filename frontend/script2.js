const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

const promptGrid = document.getElementById("promptGrid");
const searchInput = document.getElementById("searchInput");

let prompts = [];

/* LOAD PROMPTS */
async function loadPrompts() {
  try {
    promptGrid.innerHTML = "<p>Loading prompts...</p>";

    const response = await fetch(API_URL);
    prompts = await response.json();

    displayPrompts(prompts);

  } catch (error) {
    console.log("Error loading prompts", error);

    promptGrid.innerHTML = `
      <h2>Failed to load prompts</h2>
    `;
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
      <img src="${prompt.image}" alt="${prompt.title}">

      <div class="card-content">

        <span class="category">
          ${prompt.category}
        </span>

        <h2>
          ${prompt.title}
        </h2>

        <p>
          ${text}
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
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();

    const filtered = prompts.filter(prompt =>
      (prompt.title || "").toLowerCase().includes(value) ||
      (prompt.category || "").toLowerCase().includes(value)
    );

    displayPrompts(filtered);
  });
}

/* START */
loadPrompts();