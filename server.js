const express =
require("express");

const mongoose =
require("mongoose");

const cors =
require("cors");

require("dotenv").config();

const Prompt =
require("./models/Prompt");

const app = express();

/* MIDDLEWARE */

app.use(cors());

app.use(express.json());

/* CONNECT MONGODB */

mongoose.connect(
  process.env.MONGO_URI
)

.then(() => {

  console.log(
    "MongoDB Connected 🔥"
  );

})

.catch((error) => {

  console.log(error);

});

/* HOME ROUTE */

app.get("/", (req,res) => {

  res.send(
    "SERVER RUNNING 🔥"
  );

});

/* GET ALL PROMPTS */

app.get(
  "/api/prompts",

  async (req,res) => {

    try{

      const prompts =
      await Prompt.find();

      res.json(prompts);

    }

    catch(error){

      res.status(500).json({
        message:"Error"
      });

    }

  }

);

/* SAVE PROMPT */

app.post(
  "/api/prompts",

  async (req,res) => {

    try{

      const newPrompt =
      new Prompt(req.body);

      await newPrompt.save();

      res.json({
        message:
        "Prompt Saved 🔥"
      });

    }

    catch(error){

      res.status(500).json({
        message:"Error Saving"
      });

    }

  }

);

/* START SERVER */

const PORT = 5000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});