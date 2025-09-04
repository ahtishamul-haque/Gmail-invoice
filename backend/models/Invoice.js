// backend/models/Invoice.js
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, default: "Unnamed Item" },
    quantity: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new mongoose.Schema(
  {
    gmailId: { type: String, required: true, unique: true },
    invoiceCode: { type: String, required: true, unique: true }, // <-- Add this line
    vendor: { type: String, default: "Unknown" },
    items: { type: [ItemSchema], default: [] }, // ✅ now supports multiple items
    amount: { type: Number, default: 0 }, // ✅ total invoice amount
    currency: { type: String, default: "INR" },
    paymentMethod: { type: String, default: "Unknown" },
    category: { type: String, default: "Other" },
    date: { type: Date, required: true, default: Date.now },
    snippet: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
