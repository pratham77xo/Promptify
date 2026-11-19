let previewImage = document.getElementById("previewImage");

const API_URL = "https://promptify-backend-ruty.onrender.com/api/prompts";

/* Compressed image waiting to be saved (this is what gets uploaded) */
let selectedImageData = "";
let imageRequestId = 0;
let isSaving = false;

/* The server rejects images bigger than this (in characters), so we shrink to fit */
const MAX_IMAGE_CHARS = 1000000;

/* LOGIN SYSTEM */
function checkLogin() {
  const code = document.getElementById("adminCode").value;
  const error = document.getElementById("error-message");

  const secretCode = "PROMPT123";

  if (code === secretCode) {
    localStorage.setItem("adminLoggedIn", "true");
    localStorage.setItem("adminCode", code); // sent with Trending saves
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

/* SUCCESS / ERROR MESSAGE */
let messageTimer;

function showMessage(text, type) {
  const box = document.getElementById("statusMessage");

  if (!box) {
    return;
  }

  box.textContent = text;
  box.className = type;
  box.style.display = "block";

  clearTimeout(messageTimer);

  if (type === "success") {
    messageTimer = setTimeout(() => {
      box.style.display = "none";
    }, 5000);
  }
}

/* STOP TEXT FROM BEING TREATED AS HTML */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* SHRINK IMAGE (big phone photos are several MB) */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxSide = 1200;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.82;
      let result = canvas.toDataURL("image/jpeg", quality);

      while (result.length > MAX_IMAGE_CHARS && quality > 0.4) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }

      if (result.length > MAX_IMAGE_CHARS) {
        reject(new Error("This image is too large. Please choose a smaller one."));
        return;
      }

      resolve(result);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read this image. Try a JPG or PNG file."));
    };

    img.src = url;
  });
}

/* IMAGE PREVIEW */
const imageInput = document.getElementById("imageInput");

if (imageInput) {
  imageInput.addEventListener("change", async function () {
    const file = this.files[0];

    selectedImageData = "";
    const myRequest = ++imageRequestId;

    if (!file) {
      previewImage.style.display = "none";
      return;
    }

    if (!file.type.startsWith("image/")) {
      showMessage("Please choose an image file (JPG, PNG, WEBP).", "error");
      this.value = "";
      previewImage.style.display = "none";
      return;
    }

    try {
      const compressed = await compressImage(file);

      // A newer file was picked while this one was still processing
      if (myRequest !== imageRequestId) {
        return;
      }

      selectedImageData = compressed;
      previewImage.src = compressed;
      previewImage.style.display = "block";
    } catch (error) {
      if (myRequest !== imageRequestId) {
        return;
      }

      this.value = "";
      previewImage.style.display = "none";
      showMessage(error.message, "error");
    }
  });
}

/* SAVE PROMPT */
async function savePrompt() {
  // Stops double-clicks from creating the same prompt twice
  if (isSaving) {
    return;
  }

  const title = document.getElementById("promptTitle").value.trim();
  const promptText = document.getElementById("promptText").value.trim();
  const category = document.getElementById("promptCategory").value;
  const image = selectedImageData;

  if (!title || !promptText) {
    showMessage("Please enter a title and the prompt text.", "error");
    return;
  }

  if (!image) {
    showMessage("Please choose an image first.", "error");
    return;
  }

  const promptData = {
    title,
    promptText,
    category,
    image
  };

  setSaving(true);

  // Render's free server can take up to a minute to wake up
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(promptData),
      signal: controller.signal
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || "Server error (" + res.status + ")");
    }

    clearForm();
    showMessage("Prompt saved successfully ✅", "success");
    await loadPrompts(); // refresh dashboard instantly

  } catch (error) {
    console.log(error);

    if (error.name === "AbortError") {
      showMessage("The server is taking too long (it may be waking up). Check the list below before saving again.", "error");
    } else if (error instanceof TypeError) {
      showMessage("Cannot reach the server. Check your internet and try again.", "error");
    } else {
      showMessage("Could not save: " + error.message, "error");
    }

  } finally {
    clearTimeout(timer);
    setSaving(false);
  }
}

function setSaving(saving) {
  isSaving = saving;

  const button = document.getElementById("saveBtn");

  if (button) {
    button.disabled = saving;
    button.textContent = saving ? "SAVING..." : "SAVE PROMPT";
  }
}

/* LOAD ALL PROMPTS */
async function loadPrompts() {
  const container = document.getElementById("promptContainer");

  try {
    const res = await fetch(API_URL);

    if (!res.ok) {
      throw new Error("Server error (" + res.status + ")");
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error("Unexpected response from server");
    }

    setTrendingState(data);

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
    <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title)}">
    <div class="prompt-card-content">
      <h3>${escapeHtml(data.title)}</h3>
      <p>${escapeHtml(data.promptText)}</p>
      <span>${escapeHtml(data.category)}</span>
      <button class="delete-btn">DELETE</button>
    </div>
  `;

  /* DELETE */
  const deleteBtn = card.querySelector(".delete-btn");

  deleteBtn.addEventListener("click", async () => {
    deleteBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/${data._id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || "Server error (" + res.status + ")");
      }

      showMessage("Prompt deleted ✅", "success");
      loadPrompts(); // refresh after delete

    } catch (err) {
      console.log("DELETE ERROR:", err);
      deleteBtn.disabled = false;
      showMessage("Delete failed: " + err.message, "error");
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

  // Forget the old image so it can never be saved again by mistake
  selectedImageData = "";
  imageRequestId++;
  previewImage.removeAttribute("src");
  previewImage.style.display = "none";
}

/* INIT DASHBOARD */
if (window.location.pathname.includes("admin-dashboard.html")) {
  loadPrompts();
}


/* ================= TRENDING MANAGER ================= */
const TRENDING_URL = API_URL.replace(/\/prompts$/, "/trending");

let allPrompts = [];
let trendingIds = [];
let trendingDirty = false;
let trendingSortable = null;
let isSavingTrending = false;

function setTrendingState(data) {
  allPrompts = data;
  const existing = new Set(data.map(p => p._id));

  if (trendingDirty) {
    // keep unsaved changes, only drop prompts that were deleted
    trendingIds = trendingIds.filter(id => existing.has(id));
  } else {
    trendingIds = data
      .filter(p => p.isTrending)
      .sort((a, b) => (a.trendingOrder ?? 0) - (b.trendingOrder ?? 0))
      .map(p => p._id);
  }

  renderTrending();
}

function renumberTrending() {
  document.querySelectorAll("#trendingList .trend-num").forEach((el, i) => {
    el.textContent = i + 1;
  });
}

function renderTrending() {
  const list = document.getElementById("trendingList");
  const picker = document.getElementById("trendingPicker");
  const empty = document.getElementById("trendingEmpty");

  if (!list || !picker) {
    return;
  }

  const byId = new Map(allPrompts.map(p => [p._id, p]));

  list.innerHTML = trendingIds.map((id, i) => {
    const p = byId.get(id);
    return `
      <div class="trend-item" data-id="${escapeHtml(id)}">
        <span class="trend-num">${i + 1}</span>
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" draggable="false">
        <button type="button" class="trend-remove" data-remove="${escapeHtml(id)}" aria-label="Remove from trending">&times;</button>
      </div>`;
  }).join("");

  empty.style.display = trendingIds.length ? "none" : "block";

  const selected = new Set(trendingIds);

  picker.innerHTML = allPrompts.map(p => `
    <button type="button" class="pick-item${selected.has(p._id) ? " selected" : ""}" data-id="${escapeHtml(p._id)}" aria-pressed="${selected.has(p._id)}">
      <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}">
    </button>`).join("");

  if (!trendingSortable && window.Sortable) {
    trendingSortable = Sortable.create(list, {
      animation: 150,
      filter: ".trend-remove",
      preventOnFilter: false,
      delay: 150,              // press-and-hold on touch so scrolling still works
      delayOnTouchOnly: true,
      touchStartThreshold: 5,
      ghostClass: "trend-ghost",
      chosenClass: "trend-chosen",
      dragClass: "trend-drag",
      onEnd: () => {
        trendingIds = [...list.children].map(el => el.dataset.id);
        trendingDirty = true;
        renumberTrending();
      }
    });
  }
}

function toggleTrending(id) {
  const i = trendingIds.indexOf(id);

  if (i === -1) {
    if (trendingIds.length >= 50) {
      showMessage("Trending can hold up to 50 images.", "error");
      return;
    }
    trendingIds.push(id);
  } else {
    trendingIds.splice(i, 1);
  }

  trendingDirty = true;
  renderTrending();
}

const trendingListEl = document.getElementById("trendingList");
const trendingPickerEl = document.getElementById("trendingPicker");

if (trendingListEl) {
  trendingListEl.addEventListener("click", e => {
    const btn = e.target.closest("[data-remove]");
    if (btn) toggleTrending(btn.dataset.remove);
  });
}

if (trendingPickerEl) {
  trendingPickerEl.addEventListener("click", e => {
    const btn = e.target.closest(".pick-item");
    if (btn) toggleTrending(btn.dataset.id);
  });
}

async function saveTrending() {
  if (isSavingTrending) {
    return;
  }

  const button = document.getElementById("saveTrendingBtn");
  isSavingTrending = true;
  button.disabled = true;
  button.textContent = "SAVING...";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(TRENDING_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": localStorage.getItem("adminCode") || ""
      },
      body: JSON.stringify({ ids: trendingIds }),
      signal: controller.signal
    });

    const result = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(result.message || "Server error (" + res.status + ")");
    }

    trendingDirty = false;
    await loadPrompts(); // reload from the database to confirm it was saved
    showMessage("Trending order saved ✅", "success");

  } catch (error) {
    console.log(error);
    showMessage(
      error.name === "AbortError"
        ? "The server is taking too long. Try again in a moment."
        : "Could not save trending: " + error.message,
      "error"
    );

  } finally {
    clearTimeout(timer);
    isSavingTrending = false;
    button.disabled = false;
    button.textContent = "SAVE ORDER";
  }
}
