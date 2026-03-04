/**
 * Templates de corrections pour les vulnérabilités courantes
 * Basé sur les consignes du hackathon IPSSI 2026
 */

const FIX_TEMPLATES = {
  // ==========================================
  // 1. INJECTION SQL
  // ==========================================
  "javascript.sequelize.security.audit.sequelize-injection-express": {
    title: "Utiliser des requêtes préparées Sequelize",
    fixedCode: `// Solution sécurisée avec paramètres liés
const user = await User.findOne({
  where: { email: userEmail } // Sequelize échappe automatiquement
});

// OU avec raw query sécurisée :
const [results] = await sequelize.query(
  'SELECT * FROM users WHERE email = ?',
  {
    replacements: [userEmail], // Paramètres liés
    type: QueryTypes.SELECT
  }
);`,
    explanation:
      "N'utilisez JAMAIS de concaténation de chaînes dans les requêtes SQL. Utilisez toujours des requêtes préparées avec paramètres liés ($1, ?, :param) ou l'ORM Sequelize qui échappe automatiquement.",
    resources: [
      "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html",
    ],
  },

  "javascript.lang.security.audit.sql-injection": {
    title: "Requêtes SQL préparées",
    fixedCode: `// AVANT (vulnérable) :
// db.query(\`SELECT * FROM users WHERE id = '\${userId}'\`)

// APRES (sécurisé) :
// PostgreSQL (pg)
db.query('SELECT * FROM users WHERE id = $1', [userId]);

// MySQL (mysql2)
db.query('SELECT * FROM users WHERE id = ?', [userId]);

// Sequelize ORM
User.findByPk(userId);`,
    explanation:
      "Les requêtes SQL doivent utiliser des paramètres liés pour éviter l'injection. Le driver échappe automatiquement les valeurs.",
    resources: ["https://owasp.org/www-community/attacks/SQL_Injection"],
  },

  // ==========================================
  // 2. XSS (Cross-Site Scripting)
  // ==========================================
  "javascript.express.security.audit.xss.ejs.explicit-unescape.template-explicit-unescape":
    {
      title: "Échapper les sorties HTML dans les templates EJS",
      fixedCode: `<!-- AVANT (vulnérable) : -->
<!-- <%- userInput %> -->

<!-- APRES (sécurisé) : -->
<%= userInput %> <!-- Échappe automatiquement -->

<!-- OU avec DOMPurify pour HTML riche : -->
<%- DOMPurify.sanitize(userInput) %>`,
      explanation:
        "Utilisez <%= %> au lieu de <%- %> pour échapper automatiquement les caractères HTML. Pour du HTML riche, utilisez DOMPurify côté serveur.",
      resources: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
      ],
    },

  "javascript.express.security.audit.xss.mustache.explicit-unescape.template-explicit-unescape":
    {
      title: "Échapper les sorties HTML dans Mustache",
      fixedCode: `<!-- AVANT (vulnérable) : -->
<!-- {{{userInput}}} -->

<!-- APRES (sécurisé) : -->
{{userInput}} <!-- Échappe automatiquement -->`,
      explanation:
        "Utilisez {{variable}} au lieu de {{{variable}}} pour échapper automatiquement les caractères HTML dangereux.",
      resources: ["https://github.com/janl/mustache.js#variables"],
    },

  "javascript.express.security.audit.express-html-injection": {
    title: "Échapper les entrées utilisateur dans res.send()",
    fixedCode: `// AVANT (vulnérable) :
// res.send('<h1>' + userInput + '</h1>');

// APRES (sécurisé) :
const validator = require('validator');
const escaped = validator.escape(userInput);
res.send(\`<h1>\${escaped}</h1>\`);

// OU utilisez un moteur de templates (EJS, Pug)
res.render('page', { title: userInput }); // Échappe auto`,
    explanation:
      "Échappez toujours les entrées utilisateur avant de les insérer dans du HTML. Utilisez validator.escape() ou un moteur de templates.",
    resources: [
      "https://www.npmjs.com/package/validator",
      "https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/01-Testing_for_Reflected_Cross_Site_Scripting",
    ],
  },

  // ==========================================
  // 3. SECRETS EXPOSÉS
  // ==========================================
  "javascript.express.security.audit.express-session-hardcoded-secret.express-session-hardcoded-secret":
    {
      title: "Remplacer le secret de session codé en dur",
      fixedCode: `// AVANT (vulnérable) :
// app.use(session({ secret: 'keyboard cat' }));

// APRES (sécurisé) :
app.use(session({
  secret: process.env.SESSION_SECRET, // Variable d'environnement
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,      // HTTPS uniquement
    httpOnly: true,    // Pas d'accès JavaScript
    maxAge: 3600000    // 1 heure
  }
}));

// Dans .env :
// SESSION_SECRET=générez-avec: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
      explanation:
        "Ne jamais coder en dur les secrets. Utilisez des variables d'environnement. Générez un secret fort (32+ bytes aléatoires).",
      resources: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
      ],
    },

  "javascript.lang.security.audit.hardcoded-secret": {
    title: "Remplacer les secrets codés par des variables d'environnement",
    fixedCode: `// AVANT (vulnérable) :
// const apiKey = "sk_live_abc123def456";
// const dbPassword = "admin123";

// APRES (sécurisé) :
const apiKey = process.env.API_KEY;
const dbPassword = process.env.DB_PASSWORD;

// Dans .env (ajoutez à .gitignore !) :
// API_KEY=sk_live_abc123def456
// DB_PASSWORD=admin123`,
    explanation:
      "Les secrets codés en dur peuvent être exposés dans Git, logs, ou erreurs. Utilisez toujours des variables d'environnement.",
    resources: [
      "https://12factor.net/config",
      "https://www.npmjs.com/package/dotenv",
    ],
  },

  // ==========================================
  // 4. CONFIGURATION COOKIES EXPRESS
  // ==========================================
  "javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-secure":
    {
      title: "Activer le flag 'secure' sur les cookies",
      fixedCode: `// AVANT (vulnérable) :
// app.use(session({ cookie: { path: '/' } }));

// APRES (sécurisé) :
app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    secure: true,      // Transmission HTTPS uniquement
    httpOnly: true,    // Protection XSS
    sameSite: 'strict' // Protection CSRF
  }
}));`,
      explanation:
        "Le flag 'secure' garantit que les cookies ne sont transmis que via HTTPS, empêchant l'interception sur réseaux non sécurisés.",
      resources: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html",
      ],
    },

  "javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-httponly":
    {
      title: "Activer le flag 'httpOnly' sur les cookies",
      fixedCode: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    httpOnly: true,    // Empêche l'accès JavaScript
    secure: true,
    sameSite: 'strict'
  }
}));`,
      explanation:
        "Le flag 'httpOnly' empêche l'accès aux cookies via JavaScript (document.cookie), protégeant contre le vol par XSS.",
      resources: ["https://owasp.org/www-community/HttpOnly"],
    },

  "javascript.express.security.audit.express-cookie-settings.express-cookie-session-no-domain":
    {
      title: "Définir le domaine des cookies",
      fixedCode: `app.use(session({
  secret: process.env.SESSION_SECRET,
  cookie: {
    domain: process.env.COOKIE_DOMAIN || 'example.com', // Domaine explicite
    secure: true,
    httpOnly: true
  }
}));`,
      explanation:
        "Spécifiez le domaine pour éviter les cookies partagés avec des sous-domaines non sécurisés.",
      resources: [
        "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies#define_where_cookies_are_sent",
      ],
    },

  // ==========================================
  // 5. CSRF
  // ==========================================
  "javascript.express.security.audit.express-check-csurf-middleware-usage.express-check-csurf-middleware-usage":
    {
      title: "Implémenter la protection CSRF",
      fixedCode: `// Installation : npm install csurf

const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Appliquez à toutes les routes ou sélectivement :
app.use(csrfProtection);

// Dans vos formulaires :
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Template :
// <input type="hidden" name="_csrf" value="<%= csrfToken %>">`,
      explanation:
        "Les attaques CSRF exploitent les sessions actives. Utilisez des tokens CSRF pour valider l'origine des requêtes.",
      resources: [
        "https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html",
      ],
    },

  // ==========================================
  // 6. DOCKER SECURITY
  // ==========================================
  "dockerfile.security.missing-user-entrypoint.missing-user-entrypoint": {
    title: "Exécuter le conteneur avec un utilisateur non-root",
    fixedCode: `# AVANT (vulnérable) :
# FROM node:18
# COPY . /app
# WORKDIR /app
# RUN npm install
# ENTRYPOINT ["npm", "start"]

# APRES (sécurisé) :
FROM node:18

# Créer un utilisateur non-privilégié
RUN useradd -m -u 1001 appuser

COPY --chown=appuser:appuser . /app
WORKDIR /app

USER appuser  # Basculer vers utilisateur non-root

RUN npm install
ENTRYPOINT ["npm", "start"]`,
    explanation:
      "Par défaut, Docker exécute en tant que root. Si un attaquant compromet le conteneur, il a un accès root. Utilisez un utilisateur non-privilégié.",
    resources: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html",
    ],
  },

  // ==========================================
  // 7. DOCKER-COMPOSE SECURITY
  // ==========================================
  "yaml.docker-compose.security.no-new-privileges.no-new-privileges": {
    title: "Désactiver l'élévation de privilèges dans Docker Compose",
    fixedCode: `# docker-compose.yml
version: '3.8'
services:
  app:
    image: myapp:latest
    security_opt:
      - no-new-privileges:true  # Empêche l'escalade de privilèges
    cap_drop:
      - ALL                      # Supprime toutes les capabilities
    cap_add:
      - NET_BIND_SERVICE         # Ajoute seulement celles nécessaires`,
    explanation:
      "no-new-privileges empêche les processus d'obtenir plus de droits que leur parent. Réduisez la surface d'attaque en supprimant les capabilities inutiles.",
    resources: [
      "https://docs.docker.com/engine/reference/run/#security-configuration",
    ],
  },

  "yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service":
    {
      title: "Utiliser un système de fichiers en lecture seule",
      fixedCode: `version: '3.8'
services:
  app:
    image: myapp:latest
    read_only: true  # Système de fichiers en lecture seule
    tmpfs:
      - /tmp         # tmpfs pour fichiers temporaires
      - /var/run`,
      explanation:
        "Un filesystem en lecture seule empêche les attaquants de modifier des fichiers ou d'installer des backdoors.",
      resources: ["https://docs.docker.com/compose/compose-file/#read_only"],
    },

  // ==========================================
  // 8. HTTP VS HTTPS
  // ==========================================
  "problem-based-packs.insecure-transport.js-node.using-http-server.using-http-server":
    {
      title: "Utiliser HTTPS au lieu de HTTP",
      fixedCode: `// AVANT (vulnérable) :
// const http = require('http');
// http.createServer(app).listen(3000);

// APRES (sécurisé) :
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('ssl/private-key.pem'),
  cert: fs.readFileSync('ssl/certificate.pem')
};

https.createServer(options, app).listen(443);

// En production, utilisez un reverse proxy (Nginx, Caddy)
// avec Let's Encrypt pour les certificats SSL gratuits`,
      explanation:
        "HTTP transmet les données en clair (mots de passe, tokens, données sensibles). HTTPS chiffre toutes les communications.",
      resources: [
        "https://letsencrypt.org/",
        "https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html",
      ],
    },

  // ==========================================
  // 9. CRYPTO FAIBLE
  // ==========================================
  "javascript.lang.security.audit.weak-crypto-algorithm": {
    title: "Remplacer MD5/SHA1 par SHA256 minimum",
    fixedCode: `// AVANT (vulnérable) :
// const hash = crypto.createHash('md5').update(data).digest('hex');

// APRES (sécurisé) :
const hash = crypto.createHash('sha256').update(data).digest('hex');

// Pour hasher des mots de passe, utilisez bcrypt :
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);`,
    explanation:
      "MD5 et SHA1 sont cassés et ne doivent plus être utilisés. Utilisez SHA256+ pour l'intégrité, bcrypt/argon2 pour les mots de passe.",
    resources: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html",
    ],
  },

  // ==========================================
  // 10. MOTS DE PASSE
  // ==========================================
  "javascript.lang.security.audit.password-in-code": {
    title: "Hasher les mots de passe avec bcrypt",
    fixedCode: `// Installation : npm install bcrypt

const bcrypt = require('bcrypt');

// Lors de l'inscription :
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
// Stockez hashedPassword en base de données

// Lors de la connexion :
const match = await bcrypt.compare(plainPassword, hashedPassword);
if (match) {
  // Authentification réussie
}`,
    explanation:
      "Ne jamais stocker les mots de passe en clair. Utilisez bcrypt (ou argon2) avec un salt fort (10+ rounds minimum).",
    resources: [
      "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html",
      "https://www.npmjs.com/package/bcrypt",
    ],
  },
};

/**
 * Récupère un template de correction basé sur le ruleId
 * @param {string} ruleId - ID de la règle Semgrep/ESLint
 * @returns {Object|null} Template de correction ou null
 */
function getFixTemplate(ruleId) {
  if (!ruleId) return null;

  // Recherche exacte
  if (FIX_TEMPLATES[ruleId]) {
    return FIX_TEMPLATES[ruleId];
  }

  // Recherche partielle (ex: "javascript.express.security.audit.xss.*")
  const partialMatch = Object.keys(FIX_TEMPLATES).find((key) =>
    ruleId.includes(key.split(".").slice(0, -1).join(".")),
  );

  return partialMatch ? FIX_TEMPLATES[partialMatch] : null;
}

/**
 * Génère un template de correction générique si aucun template spécifique n'existe
 */
function getGenericFixTemplate(severity, owaspCategory) {
  const templates = {
    A01: {
      title: "Contrôler les accès",
      fixedCode:
        "// Vérifiez les permissions avant chaque action sensible\nif (!user.hasPermission('action')) throw new ForbiddenError();",
      explanation:
        "Implémentez un contrôle d'accès basé sur les rôles (RBAC) pour toutes les ressources sensibles.",
    },
    A02: {
      title: "Sécuriser la cryptographie",
      fixedCode:
        "// Utilisez des algorithmes modernes\nconst hash = crypto.createHash('sha256');\n// Pour les mots de passe : bcrypt avec 10+ rounds",
      explanation:
        "Utilisez des algorithmes cryptographiques modernes et des clés de taille suffisante.",
    },
    A03: {
      title: "Valider et échapper les entrées",
      fixedCode:
        "// Validez les entrées\nconst schema = Joi.object({ email: Joi.string().email() });\n// Échappez les sorties\nconst escaped = validator.escape(userInput);",
      explanation:
        "Validez toutes les entrées utilisateur et échappez les sorties selon le contexte (HTML, SQL, etc.).",
    },
  };

  return (
    templates[owaspCategory] || {
      title: "Corriger la vulnérabilité",
      fixedCode: "// Consultez la documentation OWASP pour des recommandations",
      explanation: "Appliquez les bonnes pratiques de sécurité OWASP.",
    }
  );
}

module.exports = {
  FIX_TEMPLATES,
  getFixTemplate,
  getGenericFixTemplate,
};
