export const mockScanResults = {
  project: {
    name: 'my-express-app',
    url: 'https://github.com/user/my-express-app',
    language: 'JavaScript',
    scannedAt: new Date().toISOString(),
  },
  score: 38,
  grade: 'F',
  summary: {
    total: 10,
    critical: 3,
    high: 5,
    medium: 2,
    low: 0,
  },
  tools: [
    { name: 'Semgrep', icon: 'search', findings: 5, status: 'done' },
    { name: 'npm audit', icon: 'package', findings: 3, status: 'done' },
    { name: 'ESLint Security', icon: 'shield', findings: 2, status: 'done' },
  ],
  owaspDistribution: [
    { id: 'A01', name: 'Broken Access Control', count: 1 },
    { id: 'A02', name: 'Security Misconfiguration', count: 2 },
    { id: 'A03', name: 'Supply Chain Failures', count: 3 },
    { id: 'A04', name: 'Cryptographic Failures', count: 1 },
    { id: 'A05', name: 'Injection', count: 2 },
    { id: 'A06', name: 'Insecure Design', count: 0 },
    { id: 'A07', name: 'Authentication Failures', count: 1 },
    { id: 'A08', name: 'Software/Data Integrity Failures', count: 0 },
    { id: 'A09', name: 'Logging Failures', count: 0 },
    { id: 'A10', name: 'Mishandling of Exceptional Conditions', count: 0 },
  ],
  owaspCovered: 8,
  findings: [
    {
      id: 1,
      severity: 'critical',
      owasp: 'A05',
      tool: 'Semgrep',
      title: "Concatenation directe de l'input utilisateur dans une requete SQL",
      file: 'src/controllers/userController.js',
      line: 42,
      description:
        "L'input utilisateur est directement concatene dans une requete SQL, ce qui permet une injection SQL.",
      fix: {
        description: 'Utiliser des requetes preparees:',
        code: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
      },
    },
    {
      id: 2,
      severity: 'high',
      owasp: 'A08',
      tool: 'ESLint Security',
      title: 'Route POST sans protection CSRF',
      file: 'src/routes/api.js',
      line: 15,
      description:
        'La route POST ne possede aucune protection CSRF, permettant des attaques cross-site request forgery.',
      fix: {
        description: 'Ajouter le middleware CSRF:',
        code: "const csrf = require('csurf');\napp.use(csrf({ cookie: true }));",
      },
    },
    {
      id: 3,
      severity: 'high',
      owasp: 'A03',
      tool: 'npm audit',
      title: 'braces@3.0.2 - Vulnerabilite ReDoS connue',
      file: 'package.json',
      line: 1,
      description:
        'La dependance braces version 3.0.2 contient une vulnerabilite ReDoS (Regular Expression Denial of Service).',
      fix: {
        description: 'Mettre a jour la dependance:',
        code: 'npm update braces --depth 5',
      },
    },
    {
      id: 4,
      severity: 'critical',
      owasp: 'A04',
      tool: 'Semgrep',
      title: 'Mot de passe en dur dans le code source',
      file: 'src/config/database.js',
      line: 8,
      description:
        'Un mot de passe est code en dur dans le fichier de configuration de la base de donnees.',
      fix: {
        description: 'Utiliser une variable d\'environnement:',
        code: "const dbPassword = process.env.DB_PASSWORD;",
      },
    },
    {
      id: 5,
      severity: 'high',
      owasp: 'A05',
      tool: 'ESLint Security',
      title: 'Utilisation de eval() avec input utilisateur',
      file: 'src/utils/parser.js',
      line: 23,
      description:
        "L'utilisation de eval() avec des donnees utilisateur permet l'execution de code arbitraire.",
      fix: {
        description: 'Remplacer eval() par JSON.parse():',
        code: 'const data = JSON.parse(userInput);',
      },
    },
    {
      id: 6,
      severity: 'high',
      owasp: 'A02',
      tool: 'Semgrep',
      title: 'Headers de securite manquants',
      file: 'src/server.js',
      line: 5,
      description:
        "Les headers de securite (X-Content-Type-Options, X-Frame-Options, CSP) ne sont pas configures.",
      fix: {
        description: 'Ajouter helmet pour les headers de securite:',
        code: "const helmet = require('helmet');\napp.use(helmet());",
      },
    },
    {
      id: 7,
      severity: 'critical',
      owasp: 'A01',
      tool: 'Semgrep',
      title: "Pas de verification d'autorisation sur la route admin",
      file: 'src/routes/admin.js',
      line: 12,
      description:
        "La route /admin n'a aucun middleware d'authentification ou d'autorisation.",
      fix: {
        description: 'Ajouter un middleware d\'authentification:',
        code: "router.get('/admin', authMiddleware, adminOnly, (req, res) => { ... });",
      },
    },
    {
      id: 8,
      severity: 'medium',
      owasp: 'A02',
      tool: 'Semgrep',
      title: 'Mode debug active en production',
      file: 'src/server.js',
      line: 3,
      description:
        "Le mode debug est active, exposant des informations sensibles sur l'application.",
      fix: {
        description: 'Conditionner le debug a l\'environnement:',
        code: "if (process.env.NODE_ENV === 'development') {\n  app.use(errorHandler({ log: true }));\n}",
      },
    },
    {
      id: 9,
      severity: 'high',
      owasp: 'A03',
      tool: 'npm audit',
      title: 'express@4.17.1 - Vulnerabilite connue de severite elevee',
      file: 'package.json',
      line: 1,
      description:
        'La version d\'Express utilisee contient des vulnerabilites connues. Mise a jour recommandee.',
      fix: {
        description: 'Mettre a jour Express:',
        code: 'npm install express@latest',
      },
    },
    {
      id: 10,
      severity: 'medium',
      owasp: 'A07',
      tool: 'npm audit',
      title: 'Session cookie sans flag HttpOnly',
      file: 'src/config/session.js',
      line: 7,
      description:
        "Le cookie de session n'a pas le flag HttpOnly, le rendant accessible via JavaScript.",
      fix: {
        description: 'Ajouter les flags de securite au cookie:',
        code: "session({\n  cookie: { httpOnly: true, secure: true, sameSite: 'strict' }\n})",
      },
    },
  ],
}
