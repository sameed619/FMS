import * as dotenv from "dotenv";
dotenv.config();

// Change the console log to check the DB variable Prisma uses
console.log("DATABASE_URL check:", process.env.DATABASE_URL ? "Loaded" : "Missing");

import express from "express";
import cors from "cors";

import inventoryRoutes from "./routes/inventoryRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import manufacturingRoutes from "./routes/manufacturingRoutes.js";
import productRecipeRoutes from './routes/productRecipeRoutes.js';
import productionOrderRoutes from './routes/productionOrderRoutes.js'
import machineRoutes from './routes/machinRoutes.js'
import machineLogRoutes from './routes/machineLogRoutes.js'
import operatorEntryRoutes from './routes/operatorEntryRoutes.js'; 
import userRoutes from './routes/userRoutes.js'; 


// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// REMOVED: connectDB(); (Prisma handles connection implicitly)

// Middleware

const corsOptions = {
    // Apne frontend ka URL daalein. Yeh zaroori hai.
    origin: 'http://localhost:3000', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204,
};
app.use(cors(corsOptions)); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/inventory", inventoryRoutes);
// NOTE: purchaseRoutes and manufacturingRoutes still need Mongoose-to-Prisma conversion!
app.use("/api/purchase", purchaseRoutes);
app.use("/api/manufacturing", manufacturingRoutes);
app.use('/api/recipes', productRecipeRoutes);
app.use('/api/production', productionOrderRoutes)
// 🛑 NEW: Registered Machine Management Routes 🛑
app.use('/api/machines', machineRoutes) 
app.use('/api/machine-logs', machineLogRoutes)
app.use('/api/operator-entries', operatorEntryRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Factory Management System Backend is running with Prisma",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
// NOTE: This remains the same, but it will now catch Prisma errors as well.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal Server Error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
