const mongoose = require("mongoose");

const orderLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    lineTotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    salesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderLines: {
      type: [orderLineSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Order must have at least one line",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentType: {
      type: String,
      required: true,
      enum: {
        values: ["half", "full", "cashOnDelivery"],
        message: "Payment type must be half, full, or cashOnDelivery",
      },
    },
    paymentTypeId: {
      type: Number,
      required: true,
      enum: [1, 2, 3], // 1 = half, 2 = full, 3 = cashOnDelivery
    },
    paymentAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
