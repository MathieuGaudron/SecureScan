const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");
const bcrypt = require("bcrypt");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Identifiants de connexion
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [6, 100],
      },
    },

    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50],
      },
    },

    // Informations personnelles
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Rôle et permissions
    role: {
      type: DataTypes.ENUM("user"),
      defaultValue: "user",
    },

    // Statut du compte
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Dernière connexion
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      { fields: ["email"], unique: true },
      { fields: ["username"], unique: true },
      { fields: ["role"] },
    ],
    hooks: {
      // Hash le password avant création
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      // Hash le password avant update (si modifié)
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  },
);

// Méthode pour vérifier le password
User.prototype.validatePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Méthode pour retourner le user sans le password
User.prototype.toSafeObject = function () {
  const user = this.toJSON();
  delete user.password;
  return user;
};

module.exports = User;
