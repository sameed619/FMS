import Design from "../models/Design.js";

// Get all designs
export const getAllDesigns = async (req, res) => {
  try {
    const designs = await Design.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: designs.length, data: designs });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching designs",
        error: error.message,
      });
  }
};

// Get single design by ID
export const getDesignById = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) {
      return res
        .status(404)
        .json({ success: false, message: "Design not found" });
    }
    res.status(200).json({ success: true, data: design });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching design",
        error: error.message,
      });
  }
};

// Create a new design
export const createDesign = async (req, res) => {
  try {
    const { designCode, name, category, frontDetails, backDetails, materials } =
      req.body;

    // Validate required fields
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Please provide design name" });
    }

    // Basic validation for materials if provided
    if (materials && Array.isArray(materials)) {
      for (const item of materials) {
        if (!item.itemId || !item.requiredQty) {
          return res
            .status(400)
            .json({
              success: false,
              message: "Each material must include itemId and requiredQty",
            });
        }
      }
    }

    const newDesign = new Design({
      designCode,
      name,
      category,
      frontDetails,
      backDetails,
      materials,
    });
    const saved = await newDesign.save();

    res
      .status(201)
      .json({
        success: true,
        message: "Design created successfully",
        data: saved,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error creating design",
        error: error.message,
      });
  }
};

// Update a design
export const updateDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!design) {
      return res
        .status(404)
        .json({ success: false, message: "Design not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Design updated successfully",
        data: design,
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating design",
        error: error.message,
      });
  }
};

// Delete a design
export const deleteDesign = async (req, res) => {
  try {
    const design = await Design.findByIdAndDelete(req.params.id);
    if (!design) {
      return res
        .status(404)
        .json({ success: false, message: "Design not found" });
    }
    res
      .status(200)
      .json({
        success: true,
        message: "Design deleted successfully",
        data: {},
      });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error deleting design",
        error: error.message,
      });
  }
};

