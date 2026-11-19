const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Prompt = require("./models/Prompt");

const app = express();

const ALLOWED_CATEGORIES = ["ChatGPT", "Leonardo AI", "Gemini", "Midjourney"];

/* MIDDLEWARE */
app.use(cors());

/*
  The admin page sends the image inside the JSON body, as text.
  Express only accepts 100kb by default, which is far too small for an
  image, so every SAVE was being rejected (413). 2mb is plenty because
  the admin page now shrinks images before uploading.
*/
app.use(express.json({ limit: "2mb" }));

/* CONNECT MONGODB */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected 🔥");
  })
  .catch((error) => {
    console.log("DB ERROR:", error);
  });

/* CHECK THE DATA BEFORE SAVING */
function validatePrompt(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const promptText = typeof body.promptText === "string" ? body.promptText.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";

  if (!title) return { error: "Title is required" };
  if (title.length > 150) return { error: "Title is too long (max 150 characters)" };

  if (!promptText) return { error: "Prompt text is required" };
  if (promptText.length > 5000) return { error: "Prompt text is too long (max 5000 characters)" };

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { error: "Category must be one of: " + ALLOWED_CATEGORIES.join(", ") };
  }

  if (!image) return { error: "Image is required" };
  const looksLikeImage = /^data:image\//i.test(image) || /^https?:\/\//i.test(image);
  if (!looksLikeImage) return { error: "Image is not valid" };
  if (image.length > 1500000) return { error: "Image is too large. Please choose a smaller image." };

  return { data: { title, promptText, category, image } };
}

/* HOME ROUTE */
app.get("/", (req, res) => {
  res.send("SERVER RUNNING 🔥");
});

/* GET ALL PROMPTS */
app.get("/api/prompts", async (req, res) => {
  try {
    const prompts = await Prompt.find().sort({ _id: -1 });
    res.status(200).json(prompts);
  } catch (error) {
    console.log("GET ERROR:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
});

/* SAVE PROMPT */
app.post("/api/prompts", async (req, res) => {
  try {
    const { error, data } = validatePrompt(req.body || {});

    if (error) {
      return res.status(400).json({ message: error });
    }

    // Only the four expected fields are saved (not whatever the browser sends)
    const newPrompt = new Prompt(data);
    await newPrompt.save();

    res.status(201).json({
      message: "Prompt Saved 🔥",
      data: newPrompt
    });

  } catch (error) {
    console.log("POST ERROR:", error);
    res.status(500).json({
      message: "Something went wrong on the server. Please try again."
    });
  }
});

/* DELETE PROMPT */
app.delete("/api/prompts/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid prompt id"
      });
    }

    const deleted = await Prompt.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Prompt not found"
      });
    }

    res.status(200).json({
      message: "Deleted successfully 🔥"
    });

  } catch (error) {
    console.log("DELETE ERROR:", error);
    res.status(500).json({
      message: "Delete failed",
      error: error.message
    });
  }
});

/* ADMIN CHECK (set ADMIN_CODE in your Render environment variables) */
function requireAdmin(req, res, next) {
  const code = req.get("x-admin-code");

  if (!process.env.ADMIN_CODE || code !== process.env.ADMIN_CODE) {
    return res.status(401).json({ message: "Not authorized. Log in again." });
  }

  next();
}

/* SAVE TRENDING SELECTION + ORDER (ids[0] is shown first) */
app.put("/api/trending", requireAdmin, async (req, res) => {
  try {
    const ids = req.body && req.body.ids;

    const valid =
      Array.isArray(ids) &&
      ids.length <= 50 &&
      ids.every(id => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)) &&
      new Set(ids).size === ids.length;

    if (!valid) {
      return res.status(400).json({ message: "Invalid trending list" });
    }

    // 1) un-feature everything not in the list, 2) save each position
    const ops = [
      {
        updateMany: {
          filter: { isTrending: true, _id: { $nin: ids } },
          update: { $set: { isTrending: false, trendingOrder: null } }
        }
      }
    ];

    ids.forEach((id, index) => {
      ops.push({
        updateOne: {
          filter: { _id: id },
          update: { $set: { isTrending: true, trendingOrder: index } }
        }
      });
    });

    await Prompt.bulkWrite(ops);

    res.status(200).json({ message: "Trending saved", count: ids.length });

  } catch (error) {
    console.log("TRENDING ERROR:", error);
    res.status(500).json({ message: "Could not save trending" });
  }
});

/* ERROR HANDLER (body too big, broken JSON, anything unexpected) */
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message: "Image is too large. Please choose a smaller image."
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid request data"
    });
  }

  console.log("UNHANDLED ERROR:", err);
  res.status(500).json({ message: "Server Error" });
});

/* START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
