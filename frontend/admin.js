let previewImage = document.getElementById("previewImage");

const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

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

    if (file) {
      const reader = new FileReader();

      reader.onload = function () {
        previewImage.src = reader.result;
        previewImage.style.display = "block";
      };

      reader.readAsDataURL(file);
    }
  });
}

/* SAVE PROMPT */
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
    title,
    promptText,
    category,
    image
  };

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(promptData)
    });

    clearForm();
    loadPrompts(); // 🔥 refresh dashboard instantly

  } catch (error) {
    console.log(error);
    alert("Backend not connected ❌");
  }
}

/* LOAD ALL PROMPTS (FIXED SYNC) */
async function loadPrompts() {
  const container = document.getElementById("promptContainer");

  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    container.innerHTML = "";

    data.forEach(prompt => {
      createPromptCard(prompt);
    });

  } catch (err) {
    console.log(err);
    container.innerHTML = "Failed to load prompts";
  }
}

/* CREATE CARD */
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

  /* DELETE FIX (IMPORTANT) */
  card.querySelector(".delete-btn").addEventListener("click", async () => {
    try {
      await fetch(`${API_URL}/${data._id}`, {
        method: "DELETE"
      });

      loadPrompts(); // 🔥 refresh after delete

    } catch (err) {
      console.log("DELETE ERROR:", err);
      alert("Delete failed ❌");
    }
  });

  container.appendChild(card);
}

/* CLEAR FORM */
function clearForm() {
  document.getElementById("promptTitle").value = "";
  document.getElementById("promptText").value = "";
  document.getElementById("promptCategory").selectedIndex = 0;
  document.getElementById("imageInput").value = "";
  previewImage.style.display = "none";
}

/* INIT DASHBOARD */
if (window.location.pathname.includes("admin-dashboard.html")) {
  loadPrompts();
}