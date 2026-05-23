/* PROMPT GRID */

const promptGrid =
document.getElementById(
  "promptGrid"
);

/* FETCH PROMPTS FROM BACKEND */

async function loadPrompts(){

  try{

    const response =
      await fetch(
        "http://localhost:5000/api/prompts"
      );

    const prompts =
      await response.json();

    displayPrompts(prompts);

    setupSearch(prompts);

  }

  catch(error){

    console.log(error);

  }

}

/* DISPLAY PROMPTS */

function displayPrompts(prompts){

  promptGrid.innerHTML = "";

  prompts.forEach((data) => {

    const card =
      document.createElement("div");

    card.classList.add(
      "prompt-card"
    );

    card.innerHTML = `

      <img src="${data.image}">

      <div class="card-content">

        <h2>${data.title}</h2>

        <p>${data.promptText}</p>

        <span class="category">
          ${data.category}
        </span>

        <button class="copy-btn">
          COPY PROMPT
        </button>

      </div>

    `;

    /* COPY BUTTON */

    card
    .querySelector(".copy-btn")
    .addEventListener(
      "click",
      function(){

        navigator.clipboard.writeText(
          data.promptText
        );

        this.innerText =
          "COPIED 🔥";

        setTimeout(() => {

          this.innerText =
            "COPY PROMPT";

        },2000);

      }
    );

    promptGrid.appendChild(card);

  });

}

/* SEARCH SYSTEM */

function setupSearch(prompts){

  const searchInput =
    document.getElementById(
      "searchInput"
    );

  searchInput.addEventListener(
    "input",
    function(){

      const value =
        this.value.toLowerCase();

      const filteredPrompts =
        prompts.filter((item) => {

          return (

            item.title
            .toLowerCase()
            .includes(value)

            ||

            item.promptText
            .toLowerCase()
            .includes(value)

            ||

            item.category
            .toLowerCase()
            .includes(value)

          );

        });

      displayPrompts(
        filteredPrompts
      );

    }
  );

}

/* INITIAL LOAD */

loadPrompts();