# SecureScan

Plateforme d'analyse de sécurité OWASP automatisée pour projets de développement

## Vue d'ensemble

SecureScan est une plateforme web qui permet d'analyser automatiquement la sécurité d'un projet de code source en utilisant **Semgrep** comme moteur d'analyse SAST (Static Application Security Testing). Les vulnérabilités détectées sont mappées sur le référentiel **OWASP Top 10:2025** et présentées avec un score de sécurité, des corrections intelligentes générées par **Claude AI**, et une intégration GitHub pour créer des Pull Requests automatiquement.

## Fonctionnalités principales

### Analyse de sécurité

- Soumission de repository Git (GitHub, GitLab, Bitbucket) ou upload de fichier ZIP
- Scan automatisé multi-outils : Semgrep, npm audit, ESLint Security
- Support multi-langages (JavaScript, Python, Java, Go, etc.)
- Classification automatique selon OWASP Top 10:2025
- Calcul de score de sécurité (0-100) et grade (A à F)

### Corrections intelligentes

- Génération de corrections via Claude AI (Anthropic)
- Autofix Semgrep natif quand disponible
- Templates de correction OWASP génériques
- Vue diff avant/après avec syntax highlighting
- Application automatique des corrections

### Intégration GitHub

- Connexion sécurisée avec token chiffré (AES-256-CBC)
- Création automatique de branches de correction
- Push des fichiers corrigés
- Création de Pull Requests avec description OWASP détaillée

### Interface utilisateur

- Dashboard moderne avec visualisations graphiques
- Historique des scans avec filtres et tri
- Détails des vulnérabilités avec mapping CWE
- Gestion de profil utilisateur
- Export de rapports PDF avec analyse Claude

## Architecture

```
SecureScan/
├── backend/                    # API REST Node.js/Express
│   ├── src/
│   │   ├── models/             # Sequelize ORM (PostgreSQL)
│   │   ├── routes/             # Routes API
│   │   ├── controllers/        # Logique métier
│   │   ├── services/           # Services (Git, Semgrep, Claude, GitHub)
│   │   └── middleware/         # Authentification JWT
│   └── temp/                   # Repositories et uploads temporaires
│
├── frontend/                   # SPA React + Vite
│   ├── src/
│   │   ├── pages/              # Pages (Dashboard, Scans, etc.)
│   │   ├── components/         # Composants réutilisables
│   │   ├── context/            # Gestion d'état global
│   │   └── services/           # Client API Axios
│   └── dist/                   # Build de production
│
└── docs/                       # Documentation et diagrammes UML
    ├── securescan-class-diagram.puml
    ├── use-case-diagram.puml
    ├── activity-diagram.puml
    └── sequence-diagram.puml
```

## Stack technique

### Backend

- **Node.js** v18+ / **Express.js** v4
- **PostgreSQL** v14+ / **Sequelize** ORM
- **Semgrep** (analyse SAST multi-langage)
- **npm audit** (scan des dépendances)
- **ESLint** + eslint-plugin-security (analyse statique JS)
- **Claude Sonnet 4** (SDK Anthropic) - génération de corrections et rapports
- **simple-git** (orchestration Git)
- **@octokit/rest** (API GitHub)
- **pdfkit** (génération de rapports PDF)
- **JWT** + **bcrypt** (authentification)

### Frontend

- **React** 19 / **Vite** 7
- **React Router DOM** v7 (routing)
- **Tailwind CSS** 4 (styling)
- **Recharts** (visualisations graphiques)

### Infrastructure

- **Supabase** (base de données PostgreSQL hébergée)

## Installation rapide

### Prérequis

- Node.js v18+
- PostgreSQL v14+ (ou compte Supabase)
- Python v3.8+ (pour Semgrep)
- Git

### 1. Cloner le repository

```bash
git clone https://github.com/MathieuGaudron/SecureScan.git
cd SecureScan
```

### 2. Installer Semgrep

```bash
pip install semgrep
semgrep --version
```

### 3. Configuration Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos valeurs (DB, JWT_SECRET, etc.)
npm run dev
```

Le backend démarre sur `http://localhost:3000`

### 4. Configuration Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Éditer .env (VITE_API_URL=http://localhost:3000/api)
npm run dev
```

Le frontend démarre sur `http://localhost:5173`

### 5. Accéder à l'application

Ouvrir `http://localhost:5173` dans votre navigateur.

## Documentation

### API Endpoints

Base URL: `http://localhost:3000/api`

#### Authentification

- `POST /users/register` - Inscription (email, password, username)
- `POST /users/login` - Connexion (email, password)
- `GET /users/me` - Profil utilisateur (JWT requis)
- `PUT /users/me` - Modifier le profil (JWT requis)
- `GET /users/me/analyses` - Historique des analyses (JWT requis)

#### Scans & Analyses

- `POST /scan` - Scanner un repository Git (JWT requis)
- `POST /scan/zip` - Scanner un fichier ZIP (JWT requis)
- `GET /analysis/:id` - Détails d'une analyse (JWT requis)
- `GET /analysis` - Lister toutes les analyses (JWT requis)

#### Vulnérabilités

- `GET /vulnerabilities/analysis/:analysisId` - Liste des vulnérabilités (JWT requis)
- `GET /vulnerabilities/:id` - Détails d'une vulnérabilité (JWT requis)

#### Corrections

- `POST /fixes/generate` - Générer une correction IA (JWT requis)
- `GET /fixes/vulnerability/:vulnerabilityId` - Liste des corrections (JWT requis)

#### GitHub Integration

- `POST /github/token` - Sauvegarder le token GitHub (JWT requis)
- `GET /github/status` - Statut de la connexion GitHub (JWT requis)
- `POST /github/push` - Créer une Pull Request (JWT requis)
- `DELETE /github/connection` - Supprimer la connexion GitHub (JWT requis)

#### Rapports

- `GET /reports/view/:analysisId` - Données du rapport en JSON (JWT requis)
- `GET /reports/generate/:analysisId` - Télécharger le rapport PDF (JWT requis)

### Diagrammes UML

Les diagrammes UML PlantUML sont disponibles dans le dossier `docs/`:

- **securescan-class-diagram.puml**: Modèles de données et relations
- **use-case-diagram.puml**: Cas d'utilisation et acteurs
- **activity-diagram.puml**: Flux d'un scan complet
- **sequence-diagram.puml**: Interactions entre composants

Visualisez les diagrammes avec l'extension PlantUML de VS Code ou sur [plantuml.com](http://www.plantuml.com/plantuml/uml/).

## Configuration

### Variables d'environnement Backend

Principales variables dans `backend/.env`:

```env
# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=securescan
DB_USER=postgres
DB_PASSWORD=***

# Authentification JWT
JWT_SECRET=*** (64 caractères hex)
JWT_EXPIRES_IN=7d

# Chiffrement des tokens GitHub
ENCRYPTION_KEY=*** (32 caractères)

# APIs externes (optionnel)
GITHUB_TOKEN=***
CLAUDE_API_KEY=***
```

Consultez le fichier `backend/.env.example` pour la liste complète des variables et leur documentation.

### Variables d'environnement Frontend

Principales variables dans `frontend/.env`:

```env
# URL du backend
VITE_API_URL=http://localhost:3000/api

# Configuration application
VITE_APP_NAME=SecureScan
```

Consultez le fichier `frontend/.env.example` pour la liste complète des variables disponibles.

## Utilisation

### Workflow complet

1. **Inscription/Connexion**
   - Créer un compte ou se connecter
   - Token JWT stocké dans localStorage

2. **Soumission d'un scan**
   - Entrer l'URL d'un repository Git
   - Ou uploader un fichier ZIP
   - Choisir la branche (main, dev, etc.)

3. **Analyse en cours**
   - Clonage du repository
   - Scan Semgrep avec règles OWASP
   - Calcul du score et du grade

4. **Résultats**
   - Dashboard avec score, grade, graphiques
   - Liste des vulnérabilités triées par sévérité
   - Détails OWASP et mapping CWE

5. **Corrections**
   - Générer des corrections via Claude AI
   - Vue diff avant/après
   - Sélectionner les corrections à appliquer

6. **Intégration GitHub**
   - Connecter son compte GitHub
   - Créer une Pull Request automatiquement
   - Voir la PR sur GitHub

### Exemple de commande CLI

```bash
# Scanner un repository via l'API
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "repositoryUrl": "https://github.com/user/repo",
    "branch": "main"
  }'
```

## Sécurité

### Mesures implémentées

- **Hashing de mots de passe**: bcrypt (salt rounds = 10)
- **Authentification JWT**: Tokens signés avec HS256
- **Chiffrement des tokens GitHub**: AES-256-CBC avec IV aléatoire
- **Validation des entrées**: express-validator sur tous les endpoints
- **Protection path traversal**: Validation explicite avec `startsWith()` sur tous les chemins
- **Headers sécurisés**: Helmet.js
- **CORS**: Restreint au domaine frontend uniquement
- **Rate limiting**: Limite les tentatives de connexion

### Annotations Semgrep

Les faux positifs sont documentés avec des annotations `// nosemgrep:` explicites:

```javascript
// nosemgrep: javascript.lang.security.audit.path-traversal...
const resolvedPath = path.resolve(baseDir, userInput); // Validé avec startsWith()
```

## Contribution

### Workflow Git

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'feat: Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)
- **Code**: ESLint + Prettier
- **Branches**: `feature/*`, `fix/*`, `refactor/*`

## License

Ce projet est sous licence MIT.

## Équipe

Hackathon IPSSI - Groupe 14 - Mars 2026

Allan, Nassim, Mathieu, Hady
