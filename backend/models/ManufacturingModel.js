import mongoose from "mongoose";

// ------------------------
// Machine Schema & Model
// ------------------------
const machineSchema = new mongoose.Schema(
  {
   machineId: { 
            type: String, 
            unique: true, 
            required: true, 
            trim: true,
            
            validate: {
                validator: function(v) {
                    return /^M-\d{2}$/.test(v); 
                },
                message: props => `${props.value} is not a valid Machine ID. Must be in the format 'M-XX'.`
            }
        },
        name: { type: String, required: true, trim: true },
        type: { type: String, required: true, trim: true },
        operatorName: { type: String, required: true, trim: true },
        status: { type: String, enum: ["active", "inactive"], default: "active" },
        capacityPerDay: { type: Number, required: true, min: 0 },
        workingHours: { type: Number, required: true, min: 0, max: 24 },
  },
  { timestamps: true }
);

const Machine = mongoose.model("Machine", machineSchema);

const materialsConsumedSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    qtyConsumed: {
      type: Number,
      required: true,
      min: 0.01,
    },
  },
  { _id: false }
);

const productionSchema = new mongoose.Schema(
  {
    productionId: { type: String, unique: true, required: true, trim: true },

    // References & identifiers
    machineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
    },
    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Design",
    },
    designCode: { type: String, required: true, trim: true },

    // Scheduling / timing
    date: { type: Date, required: true, default: Date.now },
    workingHours: { type: Number, required: true, min: 0, max: 24 },

    // Output / metrics
    dailyOutput: { type: Number, required: true, min: 0 },
    stitches: { type: Number, required: true, min: 0 },
    stitchCount: { type: Number }, // kept for compatibility; optional

    // Materials & variants
    fabric: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    front: { type: Boolean, default: false },
    back: { type: Boolean, default: false },
    materialsConsumed: [materialsConsumedSchema],

    // Operators & notes
    operatorName: { type: String, required: true, trim: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate productionId as PROD### before validation if missing
productionSchema.pre("validate", async function (next) {
  if (!this.productionId) {
    const count = await mongoose.model("Production").countDocuments();
    this.productionId = `PROD${String(count + 1).padStart(3, "0")}`;
  }
  next();
});

const Production = mongoose.model("Production", productionSchema);

export { Machine, Production };
