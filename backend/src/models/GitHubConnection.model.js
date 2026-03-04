const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");
const crypto = require("crypto");

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "securescan-default-key-change-in-prod-32bytes";
const ALGORITHM = "aes-256-cbc";

const GitHubConnection = sequelize.define(
  "GitHubConnection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },

    // Token GitHub chiffré
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      set(value) {
        // Chiffrement du token avant stockage
        const iv = crypto.randomBytes(16);
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf-8");
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        let encrypted = cipher.update(value, "utf8", "hex");
        encrypted += cipher.final("hex");

        // Stocke IV + token chiffré
        this.setDataValue("accessToken", iv.toString("hex") + ":" + encrypted);
      },
      get() {
        const value = this.getDataValue("accessToken");
        if (!value) return null;

        try {
          // Déchiffrement du token
          const parts = value.split(":");
          const iv = Buffer.from(parts[0], "hex");
          const encryptedText = parts[1];
          const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf-8");
          const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
          let decrypted = decipher.update(encryptedText, "hex", "utf8");
          decrypted += decipher.final("utf8");
          return decrypted;
        } catch (error) {
          console.error("Erreur de déchiffrement du token:", error);
          return null;
        }
      },
    },

    // Informations du compte GitHub
    githubUsername: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    githubEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Statut de la connexion
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "github_connections",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId"],
      },
    ],
  },
);

module.exports = GitHubConnection;
