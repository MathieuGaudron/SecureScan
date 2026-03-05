require("dotenv").config();
const { sequelize } = require("./src/database/connection");
const crypto = require("crypto");

/**
 * Script de migration pour chiffrer les tokens GitHub existants
 */
async function migrateGitHubTokens() {
  try {
    console.log("🔄 Migration des tokens GitHub...\n");

    const ENCRYPTION_KEY =
      process.env.ENCRYPTION_KEY ||
      "securescan-default-key-change-in-prod-32bytes";
    const ALGORITHM = "aes-256-cbc";

    // Récupérer tous les tokens en clair (accès direct SQL)
    const [rows] = await sequelize.query(
      'SELECT id, "accessToken" FROM "github_connections"',
    );

    console.log(`📊 ${rows.length} connexion(s) GitHub trouvée(s)\n`);

    let migrated = 0;
    let alreadyEncrypted = 0;

    for (const row of rows) {
      const token = row.accessToken;

      // Vérifier si déjà chiffré (format: IV:encrypted)
      if (token.includes(":") && token.split(":").length === 2) {
        console.log(`✅ Token ${row.id} déjà chiffré`);
        alreadyEncrypted++;
        continue;
      }

      // Chiffrer le token
      console.log(`🔐 Chiffrement du token ${row.id}...`);

      const iv = crypto.randomBytes(16);
      const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), "utf-8");
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let encrypted = cipher.update(token, "utf8", "hex");
      encrypted += cipher.final("hex");

      const encryptedValue = iv.toString("hex") + ":" + encrypted;

      // Mettre à jour en DB
      await sequelize.query(
        'UPDATE "github_connections" SET "accessToken" = :encryptedToken WHERE id = :id',
        {
          replacements: {
            encryptedToken: encryptedValue,
            id: row.id,
          },
        },
      );

      console.log(`✅ Token ${row.id} chiffré avec succès`);
      migrated++;
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Migration terminée !`);
    console.log(`   - Tokens chiffrés: ${migrated}`);
    console.log(`   - Déjà chiffrés: ${alreadyEncrypted}`);
    console.log("=".repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:", error);
    process.exit(1);
  }
}

migrateGitHubTokens();
