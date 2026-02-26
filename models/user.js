const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  phone: {
    type: String,
  },

  address: {
    type: String,
  },

  idCardNumber: {
    type: String,
    unique: true,
    sparse: true,
  },

  email: {
    type: String,
    unique: true,
    sparse: true, // important because email is optional
  },

  password: {
    type: String,
  },

  role: {
    type: String,
    enum: ["admin", "salesman"],
    default: "salesman",
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  resetCode: String,

  resetCodeExpiry: Date,

  refreshToken: String,

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);