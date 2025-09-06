const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  user: { type: String, required: true },
  access_token: String,
  refresh_token: String,
  scope: String,
  token_type: String,
  expiry_date: Number,
});

module.exports = mongoose.model("Token", tokenSchema);

