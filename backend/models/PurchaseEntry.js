import mongoose from "mongoose";

const purchaseEntrySchema = new mongoose.Schema(
  {
    purchaseId: {
      type: String,
      unique: true,
      required: true,
    },
    supplier: {
      type: String,
      required: true,
      trim: true,
    },
    billNumber: {
      type: String,
      required: true,
      trim: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 0,
        },
        pricePerUnit: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    contact: {
      type: Number,
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Generate purchaseId before saving
// inventory.js - MUST BE pre('validate')
purchaseEntrySchema.pre("validate", async function (next) { 
  if (!this.purchaseId) {
    const count = await mongoose.model("PurchaseEntry").countDocuments();
    this.purchaseId = `PUR${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

const PurchaseEntry = mongoose.model("PurchaseEntry", purchaseEntrySchema);

export default PurchaseEntry;



