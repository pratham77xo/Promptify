const mongoose = require("mongoose");

const promptSchema =
new mongoose.Schema({

  title:{
    type:String,
    required:true
  },

  promptText:{
    type:String,
    required:true
  },

  category:{
    type:String,
    required:true
  },

  image:{
    type:String,
    required:true
  }

});

module.exports =
mongoose.model(
  "Prompt",
  promptSchema
);