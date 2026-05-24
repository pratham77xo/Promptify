const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Prompt = require("./models/Prompt");

const app = express();

/* MIDDLEWARE */
app.use(cors());
app.use(express.json());

/* CONNECT MONGODB */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected 🔥");
  })
  .catch((error) => {
    console.log("DB ERROR:", error);
  });

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
    const newPrompt = new Prompt(req.body);
    await newPrompt.save();

    res.status(201).json({
      message: "Prompt Saved 🔥",
      data: newPrompt
    });

  } catch (error) {
    console.log("POST ERROR:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
});

/* DELETE PROMPT (🔥 FIX ADDED) */
app.delete("/api/prompts/:id", async (req, res) => {
  try {
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

/* START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});