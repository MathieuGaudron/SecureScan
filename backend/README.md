# SecureScan API Backend

Plateforme d'analyse de qualité et sécurité de code - API REST

## Table des matières

- [À propos](#à-propos)
- [Stack Technique](#stack-technique)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Endpoints](#api-endpoints)
- [Modèles de données](#modèles-de-données)
- [Contribution](#contribution)

---

## À propos

SecureScan est une plateforme web d'analyse de sécurité de code qui orchestre des outils de sécurité open source (Semgrep, ESLint, npm audit) et mappe les vulnérabilités détectées sur le référentiel OWASP Top 10:2025.

### Fonctionnalités principales

- Soumission de repository Git ou upload ZIP
- Analyse automatisée multi-outils
- Classification selon OWASP Top 10:2025
- Dashboard de visualisation des résultats
- Système de correction automatisé
- Intégration Git pour push des corrections

---

## Stack Technique

**Backend**

- Node.js 18+
- Express.js
- Sequelize ORM
- PostgreSQL / Supabase

**Outils de scan**

- Semgrep (SAST multi-langage)
- ESLint + eslint-plugin-security
- npm audit (scan des dépendances)

**Intégrations**

- simple-git (gestion Git)
- Octokit (GitHub API)

---

## Architecture

```
backend/
├── src/
│   ├── server.js                    Point d'entrée Express
│   │
│   ├── database/
│   │   └── connection.js            Connexion Sequelize
│   │
│   ├── models/
│   │   ├── Analysis.model.js        Table analyses
│   │   ├── Vulnerability.model.js   Table vulnerabilities
│   │   └── Fix.model.js             Table fixes
│   │
│   ├── routes/
│   │   ├── analysis.routes.js       Endpoints analyses
│   │   ├── vulnerability.routes.js  Endpoints vulnérabilités
│   │   └── fix.routes.js            Endpoints corrections
│   │
│   ├── controllers/
│   │   ├── analysis.controller.js   Logique métier analyses
│   │   ├── vulnerability.controller.js
│   │   └── fix.controller.js
│   │
│   ├── services/
│   │   ├── git.service.js           Clone, push Git
│   │   ├── semgrep.service.js       Orchestration Semgrep
│   │   ├── eslint.service.js        Orchestration ESLint
│   │   ├── npmaudit.service.js      Orchestration npm audit
│   │   ├── analysis.service.js      Orchestration globale
│   │   └── fix.service.js           Génération de fixes
│   │
│   └── utils/
│       └── owaspMapping.js          Mapping OWASP Top 10
│
├── temp/                            Repositories temporaires
├── package.json
├── .env.example
└── README.md
```

---

## Installation

### Prérequis

- Node.js v18 ou supérieur
- PostgreSQL v14+ ou compte Supabase
- Git
- Python 3.x (pour Semgrep)

### Outils de scan

```bash
# Installation de Semgrep
pip install semgrep

# Vérification
semgrep --version
```

### Installation des dépendances Node.js

```bash
cd backend
npm install
```

---

## Configuration

### 1. Base de données

**Option A : Supabase (recommandé pour le hackathon)**

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Noter les credentials de connexion dans Settings > Database

**Option B : PostgreSQL local**

```sql
CREATE DATABASE securescan;
```

### 2. Variables d'environnement

Copier le fichier d'exemple et éditer les valeurs :

```bash
cp .env.example .env
```

Contenu du fichier `.env` :

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase - Session Pooler)
DB_HOST=aws-1-eu-west-1.pooler.supabase.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.PROJECT_REF
DB_PASSWORD=votre_mot_de_passe

# OU Database (Local)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=securescan
# DB_USER=postgres
# DB_PASSWORD=votre_mot_de_passe

# Directories
TEMP_REPOS_DIR=./temp/repos
TEMP_UPLOADS_DIR=./temp/uploads

# GitHub API (optionnel)
GITHUB_TOKEN=your_token_here
```

---

## Utilisation

### Démarrage en mode développement

```bash
npm run dev
```

Le serveur démarre sur http://localhost:3000

### Démarrage en mode production

```bash
npm start
```

### Vérification de l'état

```bash
curl http://localhost:3000/api/health
```

Réponse attendue :

```json
{
  "status": "OK",
  "message": "SecureScan API is running",
  "timestamp": "2026-03-02T13:00:00.000Z"
}
```

---

## API Endpoints

### Health Check

**GET** `/api/health`

Vérifier l'état de l'API.

### Analyses

**POST** `/api/analysis/submit`
Soumettre un repository pour analyse

Body :

```json
{
  "repositoryUrl": "https://github.com/user/repo",
  "sourceType": "git",
  "githubToken": "optional_token"
}
```

**GET** `/api/analysis/:id`
Récupérer les détails d'une analyse

**GET** `/api/analysis/:id/status`
Récupérer le statut d'une analyse en cours

**GET** `/api/analysis`
Lister toutes les analyses

Query params : `limit`, `offset`

### Vulnérabilités

**GET** `/api/vulnerabilities/analysis/:analysisId`
Lister les vulnérabilités d'une analyse

Query params : `severity`, `owaspCategory`, `toolSource`

**GET** `/api/vulnerabilities/:id`
Détails d'une vulnérabilité

**GET** `/api/vulnerabilities/analysis/:analysisId/statistics`
Statistiques par sévérité et OWASP Top 10

### Corrections

**POST** `/api/fixes/generate/:vulnerabilityId`
Générer une correction automatique

**POST** `/api/fixes/:id/accept`
Accepter une correction

**POST** `/api/fixes/:id/reject`
Rejeter une correction

**POST** `/api/fixes/analysis/:analysisId/apply-all`
Appliquer toutes les corrections acceptées et push sur Git

---

## Modèles de données

### Analysis

Représente une analyse de sécurité lancée sur un repository.

Champs principaux :

- `id` : UUID
- `repositoryUrl` : URL du repository
- `status` : pending, analyzing, completed, failed
- `securityScore` : Score sur 100
- `scoreGrade` : A, B, C, D, F
- `totalVulnerabilities` : Nombre total
- `criticalCount`, `highCount`, `mediumCount`, `lowCount` : Répartition

### Vulnerability

Représente une vulnérabilité détectée.

Champs principaux :

- `id` : UUID
- `analysisId` : Foreign key vers Analysis
- `title` : Titre de la vulnérabilité
- `severity` : critical, high, medium, low, info
- `owaspCategory` : A01, A02, etc.
- `filePath` : Fichier concerné
- `lineNumber` : Ligne concernée
- `toolSource` : semgrep, eslint, npm-audit

### Fix

Représente une correction proposée.

Champs principaux :

- `id` : UUID
- `vulnerabilityId` : Foreign key vers Vulnerability
- `fixType` : template, ai-generated, manual
- `originalCode` : Code vulnérable
- `fixedCode` : Code corrigé
- `status` : proposed, accepted, rejected, applied

---

## Contribution

### Structure du code

- Respecter l'architecture MVC (Models, Controllers, Services)
- Utiliser async/await pour les opérations asynchrones
- Gérer les erreurs avec try/catch
- Logger les opérations importantes

### Convention de nommage

- Fichiers : `kebab-case.js`
- Classes : `PascalCase`
- Fonctions/variables : `camelCase`
- Constantes : `UPPER_SNAKE_CASE`

---

## Équipe

Hackathon Bachelor Dev IPSSI - Mars 2026

## Licence

MIT
