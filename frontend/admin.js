let previewImage = document.getElementById("previewImage");

/* LOGIN SYSTEM */
function checkLogin() {
  const code = document.getElementById("adminCode").value;
  const error = document.getElementById("error-message");

  const secretCode = "PROMPT123";

  if (code === secretCode) {
    localStorage.setItem("adminLoggedIn", "true");
    window.location.href = "admin-dashboard.html";
  } else {
    error.innerText = "Wrong Admin Code";
  }
}

/* PROTECT DASHBOARD */
if (window.location.pathname.includes("admin-dashboard.html")) {
  const loggedIn = localStorage.getItem("adminLoggedIn");

  if (loggedIn !== "true") {
    window.location.href = "admin-login.html";
  }
}

/* LOGOUT */
function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "admin-login.html";
}

/* IMAGE PREVIEW */
const imageInput = document.getElementById("imageInput");

if (imageInput) {
  imageInput.addEventListener("change", function () {
    const file = this.files[0];

    if (file && previewImage) {
      const reader = new FileReader();

      reader.onload = function () {
        previewImage.src = reader.result;
        previewImage.style.display = "block";
      };

      reader.readAsDataURL(file);
    }
  });
}

/* SAVE PROMPT (FIXED FOR DEPLOYMENT) */
async function savePrompt() {
  const title = document.getElementById("promptTitle").value;
  const promptText = document.getElementById("promptText").value;
  const category = document.getElementById("promptCategory").value;
  const image = previewImage?.src || "";

  if (!title || !promptText || !image) {
    alert("Please fill all fields");
    return;
  }

  const promptData = {
    id: Date.now(),
    title,
    promptText,
    category,
    image
  };

  try {
    /* ⚠️ IMPORTANT FIX */
    /* Replace localhost with real backend URL later */
    const response = await fetch("/api/prompts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(promptData)
    });

    const result = await response.json();

    alert(result.message || "Saved!");

    createPromptCard(promptData);

    /* CLEAR INPUTS */
    document.getElementById("promptTitle").value = "";
    document.getElementById("promptText").value = "";
    document.getElementById("promptCategory").selectedIndex = 0;
    document.getElementById("imageInput").value = "";
    previewImage.style.display = "none";

  } catch (error) {
    console.log(error);
    alert("Backend not connected (deploy backend separately)");
  }
}

/* CREATE PROMPT CARD */
function createPromptCard(data) {
  const container = document.getElementById("promptContainer");

  const card = document.createElement("div");
  card.classList.add("prompt-card");

  card.innerHTML = `
    <img src="${data.image}">
    <div class="prompt-card-content">
      <h3>${data.title}</h3>
      <p>${data.promptText}</p>
      <span>${data.category}</span>
      <button class="delete-btn">DELETE</button>
    </div>
  `;

  card.querySelector(".delete-btn").addEventListener("click", function () {
    card.remove();
  });

  container.appendChild(card);
}