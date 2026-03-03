require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./database/connection");
const { User, Analysis, Vulnerability, Fix } = require("./models");
const scanRoutes = require("./routes/scan.routes");
const userRoutes = require("./routes/user.routes");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (dev)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "SecureScan API is running",
    timestamp: new Date().toISOString(),
  });
});

// ========================================
// ROUTES
// ========================================
app.use("/api/users", userRoutes);
app.use("/api", scanRoutes);

// TODO: Import et enregistrer les routes API
// const analysisRoutes = require('./routes/analysis.routes');
// app.use('/api/analysis', analysisRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// ========================================
// DATABASE & SERVER START
// ========================================

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await sequelize.authenticate();
    console.log("✓ PostgreSQL connected successfully");

    // Synchroniser les modèles avec la DB (en dev, utilise alter: true)
    await sequelize.sync({ alter: process.env.NODE_ENV === "development" });
    console.log("✓ Database models synchronized");

    // Lancer le serveur
    app.listen(PORT, () => {
      console.log("\n========================================");
      console.log(`🚀 SecureScan API running`);
      console.log(`📡 http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log("========================================\n");
    });
  } catch (error) {
    console.error("✗ Unable to start server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
