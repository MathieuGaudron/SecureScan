const Analysis = require("./Analysis.model");
const Vulnerability = require("./Vulnerability.model");
const Fix = require("./Fix.model");

// Relations entre les modèles

// Analysis <-> Vulnerability (1:N)
Analysis.hasMany(Vulnerability, {
  foreignKey: "analysisId",
  as: "vulnerabilities",
  onDelete: "CASCADE",
});

Vulnerability.belongsTo(Analysis, {
  foreignKey: "analysisId",
  as: "analysis",
});

// Vulnerability <-> Fix (1:1)
Vulnerability.hasOne(Fix, {
  foreignKey: "vulnerabilityId",
  as: "fix",
  onDelete: "CASCADE",
});

Fix.belongsTo(Vulnerability, {
  foreignKey: "vulnerabilityId",
  as: "vulnerability",
});

module.exports = {
  Analysis,
  Vulnerability,
  Fix,
};
