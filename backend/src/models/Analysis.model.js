const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const Analysis = sequelize.define(
  "Analysis",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Relation avec User
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    // Informations du repository
    repositoryUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    repositoryName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    sourceType: {
      type: DataTypes.ENUM("git", "zip", "upload"),
      defaultValue: "git",
    },

    branch: {
      type: DataTypes.STRING,
      defaultValue: "main",
    },

    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Statut de l'analyse
    status: {
      type: DataTypes.ENUM("pending", "analyzing", "completed", "failed"),
      defaultValue: "pending",
    },

    // Scores et grades
    securityScore: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },

    scoreGrade: {
      type: DataTypes.ENUM("A", "B", "C", "D", "F"),
      allowNull: true,
    },

    // Compteurs de vulnérabilités
    totalVulnerabilities: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    criticalCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    highCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    mediumCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    lowCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    infoCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // Dates
    scanStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    scanCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Erreur (si le scan échoue)
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "analyses",
    timestamps: true,
    indexes: [
      { fields: ["status"] },
      { fields: ["createdAt"] },
      { fields: ["repositoryUrl"] },
    ],
  },
);

module.exports = Analysis;
