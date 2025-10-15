import mongoose from "mongoose";

const designSchema = new mongoose.Schema(
  {
    designCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    frontDetails: {
      type: String,
      trim: true,
    },
    backDetails: {
      type: String,
      trim: true,
    },
    materials: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Inventory",
          required: true,
        },
        requiredQty: {
          type: Number,
          required: true,
          min: 0.01,
        },
        unit: {
          type: String,
          trim: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate designCode as DSN### before validation if missing
// Using pre('validate') so it runs for both create() and save()
designSchema.pre("validate", async function (next) {
  if (!this.designCode) {
    const count = await mongoose.model("Design").countDocuments();
    this.designCode = `DSN${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

const Design = mongoose.model("Design", designSchema);
export default Design;

