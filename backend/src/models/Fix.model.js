const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const Fix = sequelize.define(
  "Fix",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Relation avec Vulnerability
    vulnerabilityId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "vulnerabilities",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    // Type de correction
    fixType: {
      type: DataTypes.ENUM(
        "semgrep-autofix",
        "template",
        "generic",
        "ai-generated",
        "manual",
      ),
      defaultValue: "template",
    },

    // Description de la correction
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Code avant/après
    originalCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    fixedCode: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Statut de la correction
    status: {
      type: DataTypes.ENUM("proposed", "accepted", "rejected", "applied"),
      defaultValue: "proposed",
    },

    // Informations Git (après application)
    gitBranch: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    gitCommitHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    appliedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "fixes",
    timestamps: true,
    indexes: [
      { fields: ["vulnerabilityId"] },
      { fields: ["status"] },
      { fields: ["fixType"] },
    ],
  },
);

module.exports = Fix;
