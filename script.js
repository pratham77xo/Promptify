const API_URL =
"https://promptify-backend-ruty.onrender.com/api/prompts";

const promptGrid =
document.getElementById("promptGrid");

const searchInput =
document.getElementById("searchInput");

let prompts = [];

/* LOAD PROMPTS */

async function loadPrompts() {

  try {

    const response =
    await fetch(API_URL);

    prompts =
    await response.json();

    displayPrompts(prompts);

  }

  catch(error){

    console.log(
      "Error loading prompts",
      error
    );

    promptGrid.innerHTML = `
      <h2>
        Failed to load prompts
      </h2>
    `;

  }

}

/* DISPLAY PROMPTS */

function displayPrompts(data){

  promptGrid.innerHTML = "";

  data.forEach(prompt => {

    const card =
    document.createElement("div");

    card.className =
    "prompt-card";

    card.innerHTML = `

      <img
        src="${prompt.image}"
        alt="${prompt.title}"
      >

      <div class="card-content">

        <span class="category">
          ${prompt.category}
        </span>

        <h2>
          ${prompt.title}
        </h2>

        <p>
          ${prompt.prompt}
        </p>

        <button
          class="copy-btn"
          onclick="copyPrompt(
            \`${prompt.prompt}\`
          )"
        >
          Copy Prompt
        </button>

      </div>

    `;

    promptGrid.appendChild(card);

  });

}

/* COPY PROMPT */

function copyPrompt(text){

  navigator.clipboard.writeText(text);

  alert("Prompt Copied 🚀");

}

/* SEARCH */

searchInput.addEventListener(
  "input",
  () => {

    const value =
    searchInput.value.toLowerCase();

    const filtered =
    prompts.filter(prompt =>

      prompt.title
      .toLowerCase()
      .includes(value)

      ||

      prompt.category
      .toLowerCase()
      .includes(value)

    );

    displayPrompts(filtered);

  }
);

/* START */

loadPrompts();