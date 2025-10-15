import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      unique: true,
      required: true,
      match: [
            /^MSK-\d+$/, // Regex: Must start with 'MSK-', followed by a hyphen, and end with one or more digits.
            "Item ID must be in the format 'MSK-XXX' (e.g., MSK-001, MSK-100)."
        ],
        uppercase: true, // Optional: Forces the prefix to be uppercase if the user enters 'msk-'
        trim: true
    },
    itemType: {
      type: String,
      enum: ["Fabric", "Thread"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stockQty: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: String,
      required: true,
      trim: true,
    },
    lastPurchaseDate: {
      type: Date,
      default: Date.now,
    },
    billNumber: {
      type: String,
      trim: true,
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// models/Inventory.js

// ... (schema definition before the pre-save hook) ...

// --- ADD THIS BLOCK (or modify your existing one) ---
inventorySchema.pre('validate', function(next) {
    // Only run this logic if the document is NEW and itemId is being set
    if (this.isNew && this.isModified('itemId') && this.itemId) {
        const userValue = this.itemId.trim();
        const prefix = 'MSK-';
        
        // 1. Check if the user already provided the prefix (e.g., "MSK-001")
        if (userValue.startsWith(prefix)) {
            // If they did, leave it as is.
            return next();
        }

        // 2. Check if the user only provided the number (e.g., "001")
        // We only want to prepend if the value is purely numeric digits
        if (!isNaN(userValue) && userValue.length > 0) {
            this.itemId = prefix + userValue;
        } else {
            // If it's a non-numeric string, let Mongoose's standard validation fail it
            // This prevents "MSK-hello" if the user sends "hello"
            return next();
        }
    }
    next();
});
// -----------------------------------------------------

// ... (model export) ...

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;

