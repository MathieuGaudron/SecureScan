require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./database/connection");
const {
  User,
  Analysis,
  Vulnerability,
  Fix,
  GitHubConnection,
} = require("./models");
const scanRoutes = require("./routes/scan.routes");
const userRoutes = require("./routes/user.routes");
const analysisRoutes = require("./routes/analysis.routes");
const vulnerabilityRoutes = require("./routes/vulnerability.routes");
const fixRoutes = require("./routes/fix.routes");
const githubRoutes = require("./routes/github.routes");
const reportRoutes = require("./routes/report.routes");
const { cleanupOldScans } = require("./controllers/scan.controller");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE
// ========================================
app.use(cors()); // nosemgrep: javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (dev)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    console.log("Body:", JSON.stringify(req.body));
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
app.use("/api/scan", scanRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/vulnerabilities", vulnerabilityRoutes);
app.use("/api/fixes", fixRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/reports", reportRoutes);

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

    // Nettoyer les dossiers temporaires de plus de 24h au démarrage
    console.log("🧹 Nettoyage des fichiers temporaires...");
    cleanupOldScans();

    // Nettoyer automatiquement toutes les 6 heures
    setInterval(
      () => {
        console.log("🧹 Nettoyage automatique programmé...");
        cleanupOldScans();
      },
      6 * 60 * 60 * 1000,
    ); // 6 heures

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
