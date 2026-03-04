require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");

async function testClaudeAPI() {
  console.log("🧪 Test de la clé API Claude...\n");

  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    console.error("❌ CLAUDE_API_KEY non trouvée dans .env");
    process.exit(1);
  }

  console.log(`✅ Clé API trouvée: ${apiKey.substring(0, 20)}...`);

  try {
    const client = new Anthropic({ apiKey });

    console.log("\n📡 Envoi d'une requête test à Claude...");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: "Dis juste 'Bonjour' en français",
        },
      ],
    });

    console.log("\n✅ Succès ! Réponse de Claude:");
    console.log(message.content[0].text);
    console.log("\n💰 Tokens utilisés:", {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    });
    console.log("\n🎉 Votre clé API Claude fonctionne parfaitement !");
  } catch (error) {
    console.error("\n❌ Erreur lors du test:");
    console.error("Type:", error.constructor.name);
    console.error("Status:", error.status);
    console.error("Message:", error.message);

    if (error.status === 401) {
      console.error("\n⚠️  Clé API invalide ou expirée");
    } else if (error.status === 400) {
      console.error("\n⚠️  Crédit insuffisant sur votre compte");
    } else if (error.status === 404) {
      console.error("\n⚠️  Modèle introuvable (vérifiez le nom du modèle)");
    }

    process.exit(1);
  }
}

testClaudeAPI();
